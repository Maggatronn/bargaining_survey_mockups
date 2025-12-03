import React, { useState, useEffect } from 'react';
import Airtable from 'airtable';
import { getQuestionColorClass } from '../utils/colorUtils';

function InsightsPanel({ data, commentsRecords, annotations, questions, onNavigateToPointer, pendingPointer, onPointerUsed, currentSensemaker }) {
  const [insights, setInsights] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sensemakers, setSensemakers] = useState([]);
  const [pointersData, setPointersData] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newInsightTitle, setNewInsightTitle] = useState('');
  const [newInsightText, setNewInsightText] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedComments, setSelectedComments] = useState([]);
  const [selectedPointers, setSelectedPointers] = useState([]);
  const [selectedSensemakers, setSelectedSensemakers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [hoveredCitation, setHoveredCitation] = useState(null);
  const [expandedCitations, setExpandedCitations] = useState({});
  const [collapsedCommentBank, setCollapsedCommentBank] = useState({});
  const [showDepartmentSelector, setShowDepartmentSelector] = useState(false);
  const [pointerTitles, setPointerTitles] = useState({});
  const [pointerDescriptions, setPointerDescriptions] = useState({});

  // Function to download visualization as SVG
  const handleDownloadVisualization = async (pointer) => {
    const pointerData = pointer.pointerData || {};
    const tab = pointerData.tab || pointerData.type || 'view';
    
    // Generate filename
    const filterParts = [];
    if (pointerData.department && pointerData.department !== 'All') {
      filterParts.push(pointerData.department.replace(/\s+/g, '-'));
    }
    if (pointerData.selectedIssue && pointerData.selectedIssue !== 'All') {
      filterParts.push(pointerData.selectedIssue.replace(/\s+/g, '-'));
    }
    const filterString = filterParts.length > 0 ? '_' + filterParts.join('_') : '';
    const filename = `${tab}${filterString}_${new Date().toISOString().split('T')[0]}.svg`;
    
    // Find the visualization element based on tab
    let targetElement = null;
    if (tab === 'heatmap') {
      targetElement = document.querySelector('.heatmap');
    } else if (tab === 'comments') {
      targetElement = document.querySelector('.theme-histogram-vertical') || document.querySelector('.summary-stats-container');
    } else if (tab === 'priorities') {
      targetElement = document.querySelector('.priorities-histogram');
    } else if (tab === 'stipend') {
      targetElement = document.querySelector('.stipend-histogram');
    }
    
    if (!targetElement) {
      alert('Could not find visualization to download');
      return;
    }
    
    // Clone the element to avoid modifying the original
    const clone = targetElement.cloneNode(true);
    
    // Get computed styles
    const bbox = targetElement.getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;
    
    // Create SVG wrapper
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    
    // Create foreignObject to embed HTML
    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    
    // Add styles inline
    const styleElement = document.createElement('style');
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');
    styleElement.textContent = styles;
    
    foreignObject.appendChild(styleElement);
    foreignObject.appendChild(clone);
    svg.appendChild(foreignObject);
    
    // Convert to string and download
    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchDepartments();
    fetchSensemakers();
    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle pending pointer
  useEffect(() => {
    if (pendingPointer && (isAdding || editingId)) {
      // Add pointer to current insight being edited
      setSelectedPointers(prev => [...prev, pendingPointer]);
      if (onPointerUsed) onPointerUsed();
    }
  }, [pendingPointer, isAdding, editingId, onPointerUsed]);

  const fetchDepartments = async () => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const departmentsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Departments;

    if (!apiKey || !baseId || !departmentsTable) {
      console.error('Missing Airtable configuration for Departments');
      return;
    }

    const base = new Airtable({ apiKey }).base(baseId);

    try {
      const records = [];
      await base(departmentsTable)
        .select()
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach(record => {
            const deptName = record.fields.Name || record.fields.Department || 'Unknown';
            records.push({
              id: record.id,
              name: deptName
            });
          });
          fetchNextPage();
        });
      
      setDepartments(records);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchSensemakers = async () => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const sensemakersTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Sensemakers;

    if (!apiKey || !baseId || !sensemakersTable) {
      console.error('Missing Airtable configuration for Sensemakers');
      return;
    }

    const base = new Airtable({ apiKey }).base(baseId);

    try {
      const records = [];
      await base(sensemakersTable)
        .select()
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach(record => {
            const sensemakerName = record.fields['Preferred Name'] || record.fields['Full Name'] || 'Unknown';
            records.push({
              id: record.id,
              name: sensemakerName
            });
          });
          fetchNextPage();
        });
      
      setSensemakers(records);
    } catch (err) {
      console.error('Error fetching sensemakers:', err);
    }
  };

  const fetchInsights = async () => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const insightTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Insight;

    if (!apiKey || !baseId || !insightTable) {
      console.error('Missing Airtable configuration for Insights');
      setLoading(false);
      return;
    }

    const base = new Airtable({ apiKey }).base(baseId);

    try {
      const records = [];
      await base(insightTable)
        .select({
          sort: [{ field: 'Name', direction: 'asc' }]
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach(record => {
            let pointerIds = [];
            const pointersField = record.fields.Pointers;
            
            if (Array.isArray(pointersField)) {
              pointerIds = pointersField;
            }
            
            records.push({
              id: record.id,
              name: record.fields.Name,
              title: record.fields.Title || '',
              notes: record.fields.Notes,
              departments: Array.isArray(record.fields.Departments) ? record.fields.Departments : [],
              comments: Array.isArray(record.fields.Comments) ? record.fields.Comments : [],
              pointerIds: Array.isArray(pointerIds) ? pointerIds : [],
              sensemakers: Array.isArray(record.fields.Sensemakers) ? record.fields.Sensemakers : []
            });
          });
          fetchNextPage();
        });
      
      setInsights(records);
      
      // Fetch pointer details for all linked pointers
      const allPointerIds = [...new Set(records.flatMap(r => r.pointerIds || []))];
      if (allPointerIds.length > 0) {
        await fetchPointers(allPointerIds);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setLoading(false);
    }
  };

  const fetchPointers = async (pointerIds) => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const pointersTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Pointers;

    if (!apiKey || !baseId || !pointersTable || pointerIds.length === 0) return;

    const base = new Airtable({ apiKey }).base(baseId);

    try {
      const pointersMap = {};
      
      // Fetch pointers in batches
      await base(pointersTable)
        .select({
          filterByFormula: `OR(${pointerIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach(record => {
            // Parse the JSON pointer data
            let pointerData = {};
            try {
              pointerData = record.fields.Pointer ? JSON.parse(record.fields.Pointer) : {};
            } catch (e) {
              console.error('Error parsing pointer data:', e);
            }
            
            pointersMap[record.id] = {
              id: record.id,
              title: record.fields.Title || 'Untitled View',
              description: record.fields.Description || '',
              pointerData: pointerData, // {type, tab, department, searchTerm, insightFilter}
              timestamp: record.fields.Timestamp || record._rawJson?.createdTime
            };
          });
          fetchNextPage();
        });
      
      setPointersData(pointersMap);
    } catch (err) {
      console.error('Error fetching pointers:', err);
    }
  };

  const handleAddInsight = () => {
    setIsAdding(true);
    setEditingId(null);
    setNewInsightTitle('');
    setNewInsightText('');
    setSelectedDepartments([]);
    setSelectedComments([]);
    setSelectedPointers([]);
    // Auto-add the current sensemaker if one is selected
    if (currentSensemaker && currentSensemaker.id) {
      setSelectedSensemakers([currentSensemaker.id]);
    } else {
      setSelectedSensemakers([]);
    }
  };

  const handleEdit = (insight) => {
    setEditingId(insight.id);
    setNewInsightTitle(insight.title || '');
    setNewInsightText(insight.notes || '');
    // Ensure departments and comments are arrays of IDs
    setSelectedDepartments(Array.isArray(insight.departments) ? insight.departments : []);
    setSelectedComments(Array.isArray(insight.comments) ? insight.comments : []);
    
    // Convert pointer IDs to full pointer objects
    const pointerObjects = (insight.pointerIds || []).map(pointerId => {
      const pointer = pointersData[pointerId];
      if (pointer) {
        return {
          id: pointerId,
          title: pointer.title,
          description: pointer.description,
          type: pointer.pointerData?.type || pointer.pointerData?.tab,
          pointerData: pointer.pointerData,
          timestamp: pointer.timestamp
        };
      }
      return null;
    }).filter(p => p !== null);
    
    setSelectedPointers(pointerObjects);
    setSelectedSensemakers(Array.isArray(insight.sensemakers) ? insight.sensemakers : []);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewInsightTitle('');
    setNewInsightText('');
    setSelectedDepartments([]);
    setSelectedComments([]);
    setSelectedPointers([]);
  };
  
  
  const toggleComment = (commentId) => {
    if (selectedComments.includes(commentId)) {
      setSelectedComments(selectedComments.filter(c => c !== commentId));
    } else {
      setSelectedComments([...selectedComments, commentId]);
    }
  };

  const handleEditorDrop = (e) => {
    // Only handle drops that aren't on the textarea
    if (e.target.tagName === 'TEXTAREA') {
      return; // Let handleTextareaDrop handle it
    }
    
    e.preventDefault();
    const commentUniqueId = e.dataTransfer.getData('commentId');
    
    if (!commentUniqueId) return;
    
    // Get the comment record ID
    const commentEntry = Object.entries(commentsRecords).find(
      ([uniqueId]) => uniqueId === commentUniqueId
    );
    
    if (!commentEntry) return;
    
    const [, commentData] = commentEntry;
    const recordId = commentData.recordId;
    
    // Add to selected comments if not already there (without inline citation)
    if (!selectedComments.includes(recordId)) {
      setSelectedComments([...selectedComments, recordId]);
    }
  };

  const handleEditorDragOver = (e) => {
    if (e.target.tagName === 'TEXTAREA') {
      return; // Let textarea handle it
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (insightId, e) => {
    e.preventDefault();
    const commentUniqueId = e.dataTransfer.getData('commentId');
    
    if (!commentUniqueId) return;
    
    // Get the comment record ID from the uniqueId
    const comment = commentsRecords[commentUniqueId];
    if (!comment) {
      console.error('Comment not found:', commentUniqueId);
      return;
    }
    
    const commentRecordId = comment.recordId;
    
    // Find the insight
    const insight = insights.find(i => i.id === insightId);
    if (!insight) return;
    
    // Check if comment is already linked
    if (insight.comments.includes(commentRecordId)) {
      return;
    }
    
    // Add comment to insight
    const updatedComments = [...insight.comments, commentRecordId];
    
    // Update Airtable
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const insightTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Insight;
    
    if (!apiKey || !baseId || !insightTable) {
      console.error('Missing Airtable configuration');
      return;
    }
    
    const base = new Airtable({ apiKey }).base(baseId);
    
    try {
      await base(insightTable).update(insightId, {
        Comments: updatedComments
      });
      
      // Update local state
      setInsights(insights.map(i => 
        i.id === insightId 
          ? { ...i, comments: updatedComments }
          : i
      ));
    } catch (err) {
      console.error('Error linking comment:', err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.setAttribute('data-drag-over', 'true');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.removeAttribute('data-drag-over');
  };

  const toggleCommentExpansion = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleTextareaDrop = (e) => {
    e.preventDefault();
    
    // Check if it's from the comment bank or from the right panel
    const bankCommentId = e.dataTransfer.getData('bankCommentId');
    const commentUniqueId = e.dataTransfer.getData('commentId');
    
    let recordId;
    
    if (bankCommentId) {
      // Dropped from comment bank - already have the record ID
      recordId = bankCommentId;
    } else if (commentUniqueId) {
      // Dropped from right panel - need to get record ID
      const commentEntry = Object.entries(commentsRecords).find(
        ([uniqueId]) => uniqueId === commentUniqueId
      );
      
      if (!commentEntry) return;
      
      const [, commentData] = commentEntry;
      recordId = commentData.recordId;
      
      // Add to selected comments if not already there
      if (!selectedComments.includes(recordId)) {
        setSelectedComments([...selectedComments, recordId]);
      }
    } else {
      return;
    }
    
    // Get comment data for display
    const commentEntry = Object.entries(commentsRecords).find(
      ([, comment]) => comment.recordId === recordId
    );
    
    if (!commentEntry) return;
    
    const [uniqueId, commentData] = commentEntry;
    const commentText = commentData.fullText || '';
    
    // Get tags from annotations
    const responseTags = (annotations && annotations[uniqueId]) || [];
    const tagArray = Array.isArray(responseTags) 
      ? responseTags.filter(t => t && t !== '') 
      : (responseTags && responseTags !== '' ? [responseTags] : []);
    const plusDeltaTag = tagArray.find(t => t === 'plus' || t === 'delta');
    
    // Truncate comment text to ~50 chars
    const maxLength = 50;
    const truncatedText = commentText.length > maxLength 
      ? commentText.substring(0, maxLength) + '...' 
      : commentText;
    
    // Format: [[display-text|recordId]] - display text first, ID hidden at end
    const symbol = plusDeltaTag === 'plus' ? '➕' : plusDeltaTag === 'delta' ? '🔺' : '';
    const displayText = symbol ? `${symbol} ${truncatedText}` : truncatedText;
    const citation = `[[${displayText}|${recordId}]]`;
    
    // Insert citation at cursor position
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBefore = newInsightText.substring(0, cursorPos);
    const textAfter = newInsightText.substring(cursorPos);
    
    setNewInsightText(textBefore + citation + textAfter);
    
    // Set cursor position after the citation
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = cursorPos + citation.length;
      textarea.focus();
    }, 0);
  };

  const handleTextareaDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Render textarea content with inline comment previews (unused but kept for reference)
  // eslint-disable-next-line no-unused-vars
  const renderTextareaContent = (text) => {
    if (!text) return null;
    
    // Find all [[record-id]] patterns
    const citationPattern = /\[\[([^\]]+)\]\]/g;
    const parts = [];
    let lastIndex = 0;
    
    let match;
    while ((match = citationPattern.exec(text)) !== null) {
      const recordId = match[1];
      
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Add citation
      parts.push({
        type: 'citation',
        recordId: recordId,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part.content}</span>;
      } else {
        // Find the comment data
        const commentEntry = Object.entries(commentsRecords).find(
          ([, comment]) => comment.recordId === part.recordId
        );
        
        if (!commentEntry) {
          return <span key={index} className="inline-citation-edit">[Comment not found]</span>;
        }
        
        const [uniqueId, commentData] = commentEntry;
        const commentText = commentData.fullText || '';
        
        // Get economic classification from questions
        const questionObj = questions?.find(q => q.id === commentData.question);
        const economic = questionObj?.economic || 'Unknown';
        const issueColorClass = getQuestionColorClass(commentData.question || 'unknown', economic);
        
        // Get tags from annotations
        const responseTags = (annotations && annotations[uniqueId]) || [];
        const tagArray = Array.isArray(responseTags) 
          ? responseTags.filter(t => t && t !== '') 
          : (responseTags && responseTags !== '' ? [responseTags] : []);
        const plusDeltaTag = tagArray.find(t => t === 'plus' || t === 'delta');
        
        const maxLength = 50;
        const isExpanded = expandedCitations[`${part.recordId}-${index}`];
        const needsTruncation = commentText.length > maxLength;
        const displayText = (needsTruncation && !isExpanded) 
          ? commentText.substring(0, maxLength) 
          : commentText;
        
        return (
          <span
            key={index}
            className={`inline-citation-edit ${issueColorClass}`}
            data-record-id={part.recordId}
            contentEditable={false}
            style={{ 
              fontStyle: 'italic',
              padding: '2px 6px',
              borderRadius: '3px',
              display: 'inline-block',
              margin: '0 2px',
              userSelect: 'none'
            }}
          >
            {plusDeltaTag === 'plus' ? '➕ ' : plusDeltaTag === 'delta' ? '🔺 ' : '💬 '}
            {displayText}
            {needsTruncation && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCitations(prev => ({
                    ...prev,
                    [`${part.recordId}-${index}`]: !prev[`${part.recordId}-${index}`]
                  }));
                }}
                style={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  marginLeft: '2px',
                  textDecoration: 'underline'
                }}
              >
                {isExpanded ? ' [collapse]' : '... [expand]'}
              </span>
            )}
          </span>
        );
      }
    });
  };

  // Get all cited comment IDs from text
  const getCitedCommentIds = (text) => {
    if (!text) return [];
    const citationPattern = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    const citedIds = [];
    let match;
    while ((match = citationPattern.exec(text)) !== null) {
      // If there's a pipe, the ID is in the second group (new format: [[displayText|recordId]])
      // Otherwise it's in the first group (old format: [[recordId]])
      const recordId = match[2] || match[1];
      citedIds.push(recordId);
    }
    return citedIds;
  };

  // Remove a comment from an insight
  const handleRemoveComment = async (insightId, commentRecordId) => {
    const insight = insights.find(i => i.id === insightId);
    if (!insight) return;

    const updatedComments = insight.comments.filter(id => id !== commentRecordId);

    // Update Airtable
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const insightTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Insight;

    if (!apiKey || !baseId || !insightTable) return;

    const base = new Airtable({ apiKey }).base(baseId);

    try {
      await base(insightTable).update(insightId, {
        'Comments': updatedComments
      });

      // Update local state
      setInsights(insights.map(i => 
        i.id === insightId 
          ? { ...i, comments: updatedComments }
          : i
      ));
    } catch (error) {
      console.error('Error removing comment:', error);
      alert('Failed to remove comment. Please try again.');
    }
  };

  // Parse text and render inline citations
  const renderTextWithCitations = (text, insightComments) => {
    if (!text) return '';
    
    // Find all [[display-text|record-id]] or [[record-id]] patterns
    const citationPattern = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    const parts = [];
    let lastIndex = 0;
    
    let match;
    while ((match = citationPattern.exec(text)) !== null) {
      // New format: [[displayText|recordId]]
      // Old format: [[recordId]]
      const recordId = match[2] || match[1]; // If pipe exists, ID is second, else first
      const displayText = match[2] ? match[1] : null; // If pipe exists, display is first
      
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Add citation
      parts.push({
        type: 'citation',
        recordId: recordId,
        displayText: displayText
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={index}>{part.content}</span>;
      } else {
        // Find the comment data
        const commentEntry = Object.entries(commentsRecords).find(
          ([, comment]) => comment.recordId === part.recordId
        );
        
        if (!commentEntry) {
          return <span key={index} className="inline-citation">[💬]</span>;
        }
        
        const [uniqueId, commentData] = commentEntry;
        const commentText = commentData.fullText || uniqueId.split(' | ')[0];
        const questionId = commentData.question || '';
        
        // Get economic classification and question name from questions
        const questionObj = questions?.find(q => q.id === questionId);
        const economic = questionObj?.economic || 'Unknown';
        const issueColorClass = getQuestionColorClass(questionId, economic);
        
        // Get the question display name (nickname or column header)
        const questionDisplayName = commentData.questionName || 
                                    questionObj?.nickname || 
                                    questionObj?.columnHeader || 
                                    questionId || 
                                    'Unknown';
        
        // Get tags from annotations
        const responseTags = (annotations && annotations[uniqueId]) || [];
        const tagArray = Array.isArray(responseTags) 
          ? responseTags.filter(t => t && t !== '') 
          : (responseTags && responseTags !== '' ? [responseTags] : []);
        const plusDeltaTag = tagArray.find(t => t === 'plus' || t === 'delta');
        
        return (
          <span
            key={index}
            className={`inline-citation ${issueColorClass}`}
            onMouseEnter={() => setHoveredCitation(`${part.recordId}-${index}`)}
            onMouseLeave={() => setHoveredCitation(null)}
          >
            {plusDeltaTag === 'plus' ? '➕' : plusDeltaTag === 'delta' ? '🔺' : '💬'}
            {hoveredCitation === `${part.recordId}-${index}` && (
              <span className="citation-tooltip">
                <div className="tooltip-text">"{commentText}"</div>
                <div className="tooltip-meta">
                  <div><strong>Question:</strong> {questionDisplayName}</div>
                  {tagArray.length > 0 && (
                    <div><strong>Tags:</strong> {tagArray.map(t => 
                      t === 'plus' ? '➕' : 
                      t === 'delta' ? '🔺' : 
                      t === 'star' ? '⭐' : t
                    ).join(' ')}</div>
                  )}
                </div>
              </span>
            )}
          </span>
        );
      }
    });
  };

  const handleSave = async () => {
    if (!newInsightTitle.trim()) {
      alert('Please enter a title for the insight.');
      return;
    }
    if (!newInsightText.trim()) {
      alert('Please enter some text for the insight.');
      return;
    }

    setIsSaving(true);

    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const insightTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Insight;

    if (!apiKey || !baseId || !insightTable) {
      console.error('Missing Airtable configuration for Insights');
      setIsSaving(false);
      return;
    }

    const base = new Airtable({ apiKey }).base(baseId);

    try {
      // Create pointer records for new pointers
      const pointerRecordIds = [];
      const pointersTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Pointers;
      
      if (pointersTable && selectedPointers.length > 0) {
        for (const pointer of selectedPointers) {
          // Check if it's a new pointer (has pointerData) or existing (has id)
          if (pointer.id) {
            pointerRecordIds.push(pointer.id);
          } else {
            // Create the pointer record
            const pointerRecord = await base(pointersTable).create({
              Title: pointer.title || 'Untitled View',
              Description: pointer.description || '',
              Pointer: JSON.stringify(pointer.pointerData), // Store as JSON string
              Timestamp: pointer.timestamp
            });
            pointerRecordIds.push(pointerRecord.id);
          }
        }
      }
      
      if (editingId) {
        // Update existing insight
        const updatedRecord = await base(insightTable).update(editingId, {
          Title: newInsightTitle.trim(),
          Notes: newInsightText.trim(),
          Departments: selectedDepartments,
          Comments: selectedComments,
          Pointers: pointerRecordIds,
          Sensemakers: selectedSensemakers
        });

        // Update local state
        setInsights(insights.map(insight => 
          insight.id === editingId 
            ? {
                id: updatedRecord.id,
                name: updatedRecord.fields.Name,
                title: updatedRecord.fields.Title,
                notes: updatedRecord.fields.Notes,
                departments: updatedRecord.fields.Departments || [],
                comments: updatedRecord.fields.Comments || [],
                pointerIds: updatedRecord.fields.Pointers || [],
                sensemakers: updatedRecord.fields.Sensemakers || []
              }
            : insight
        ));
        
        // Fetch the new pointer details
        if (pointerRecordIds.length > 0) {
          await fetchPointers(pointerRecordIds);
        }
      } else {
        // Create new insight
        const insightNumber = insights.length;
        const insightName = `Insight_${insightNumber}`;

        const newRecord = await base(insightTable).create({
          Name: insightName,
          Title: newInsightTitle.trim(),
          Notes: newInsightText.trim(),
          Departments: selectedDepartments,
          Comments: selectedComments,
          Pointers: pointerRecordIds,
          Sensemakers: selectedSensemakers
        });

        // Add to local state
        setInsights([...insights, {
          id: newRecord.id,
          name: newRecord.fields.Name,
          title: newRecord.fields.Title,
          notes: newRecord.fields.Notes,
          departments: newRecord.fields.Departments || [],
          comments: newRecord.fields.Comments || [],
          pointerIds: newRecord.fields.Pointers || [],
          sensemakers: newRecord.fields.Sensemakers || []
        }]);
        
        // Fetch the pointer details
        if (pointerRecordIds.length > 0) {
          await fetchPointers(pointerRecordIds);
        }
      }

      // Reset form
      setIsAdding(false);
      setEditingId(null);
      setNewInsightTitle('');
      setNewInsightText('');
      setSelectedDepartments([]);
      setSelectedComments([]);
      setSelectedPointers([]);
      setSelectedSensemakers([]);
      setIsSaving(false);
    } catch (err) {
      console.error('Error saving insight:', err);
      alert('Failed to save insight. Please try again.');
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="insights-panel">
        <h2 className="panel-title">Insights</h2>
        <div className="insights-loading">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <h2 className="panel-title">Insights</h2>
        <button 
          className="add-insight-button"
          onClick={handleAddInsight}
          disabled={isAdding}
        >
          + Add Insight
        </button>
      </div>

      <div className="insights-content">
        {(isAdding || editingId) && (
          <div 
            className="insight-editor"
            onDrop={handleEditorDrop}
            onDragOver={handleEditorDragOver}
          >
            <label className="editor-label">Title</label>
            <input
              type="text"
              className="insight-title-input"
              placeholder="Enter insight title..."
              value={newInsightTitle}
              onChange={(e) => setNewInsightTitle(e.target.value)}
              autoFocus
            />
            
            <label className="editor-label">Departments</label>
            <div className="department-list-display">
              {selectedDepartments.length === 0 ? (
                <p className="no-items-text">No departments selected</p>
              ) : (
                <div className="department-tags">
                  {selectedDepartments.map(deptId => {
                    const dept = departments.find(d => d.id === deptId);
                    return dept ? (
                      <span key={deptId} className="department-tag">
                        {dept.name}
                        <button
                          className="remove-tag-button"
                          onClick={() => setSelectedDepartments(selectedDepartments.filter(d => d !== deptId))}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <button
              className="toggle-department-selector"
              onClick={() => setShowDepartmentSelector(!showDepartmentSelector)}
              type="button"
            >
              {showDepartmentSelector ? '− Hide Department Options' : '+ Add/Edit Departments'}
            </button>
            {showDepartmentSelector && (
              <div className="department-clickable-list">
                {departments.length === 0 ? (
                  <p className="loading-text">Loading departments...</p>
                ) : (
                  departments.map(dept => (
                    <div
                      key={dept.id}
                      className={`department-item ${selectedDepartments.includes(dept.id) ? 'selected' : ''}`}
                      onClick={() => {
                        if (selectedDepartments.includes(dept.id)) {
                          setSelectedDepartments(selectedDepartments.filter(d => d !== dept.id));
                        } else {
                          setSelectedDepartments([...selectedDepartments, dept.id]);
                        }
                      }}
                    >
                      <span className="department-checkbox">
                        {selectedDepartments.includes(dept.id) ? '✓' : ''}
                      </span>
                      <span className="department-name">{dept.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            
            <label className="editor-label">Sensemakers</label>
            <div className="sensemaker-list-display">
              {selectedSensemakers.length === 0 ? (
                <p className="no-items-text">No sensemakers selected</p>
              ) : (
                <div className="sensemaker-tags">
                  {selectedSensemakers.map(smId => {
                    const sm = sensemakers.find(s => s.id === smId);
                    return sm ? (
                      <span key={smId} className="sensemaker-tag">
                        {sm.name}
                        <button
                          className="remove-tag-button"
                          onClick={() => setSelectedSensemakers(selectedSensemakers.filter(s => s !== smId))}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="sensemaker-selector-compact">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedSensemakers.includes(e.target.value)) {
                    setSelectedSensemakers([...selectedSensemakers, e.target.value]);
                  }
                }}
              >
                <option value="">+ Add Sensemaker</option>
                {sensemakers.map(sm => (
                  <option key={sm.id} value={sm.id} disabled={selectedSensemakers.includes(sm.id)}>
                    {sm.name}
                  </option>
                ))}
              </select>
            </div>
            
            <label className="editor-label">
              Insight Text
              <span className="editor-hint">💡 Drag comments into the text box to cite them inline</span>
            </label>
            <textarea
              className="insight-textarea"
              placeholder="Write your insight here..."
              value={newInsightText}
              onChange={(e) => setNewInsightText(e.target.value)}
              onDrop={handleTextareaDrop}
              onDragOver={handleTextareaDragOver}
              rows={6}
            />
            <div className="citation-hint">
              💡 Drag comments into the text box to cite them. They appear as <span className="hint-citation">[[➕ Comment text...]]</span>
            </div>

            {selectedComments.length > 0 && (
              <>
                <label className="editor-label">Comment Bank ({selectedComments.length})</label>
                <div className="comment-bank-editor">
                  {selectedComments.map(commentId => {
                    const commentEntry = Object.entries(commentsRecords).find(
                      ([, comment]) => comment.recordId === commentId
                    );
                    if (!commentEntry) return null;
                    
                    const [, commentData] = commentEntry;
                    const commentText = commentData.fullText || '';
                    const isExpanded = expandedComments[commentId];
                    const isCited = getCitedCommentIds(newInsightText).includes(commentId);
                    
                    return (
                      <div 
                        key={commentId} 
                        className={`comment-bank-card ${isExpanded ? 'expanded' : ''} ${isCited ? 'cited' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('bankCommentId', commentId);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        style={{ cursor: 'grab' }}
                      >
                        <div 
                          className="comment-bank-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCommentExpansion(commentId);
                          }}
                        >
                          {isCited && <span className="cited-indicator" title="Cited in summary">💬</span>}
                          <div className="comment-text-content">
                            "{commentText}"
                          </div>
                          {!isExpanded && (
                            <div className="expand-indicator">...</div>
                          )}
                        </div>
                        <button
                          className="remove-bank-comment"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComment(commentId);
                          }}
                          title="Remove from Comment Bank"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            <p className="drag-drop-hint">💡 Drag comment cards here to add to comment bank, or into the text box to cite inline</p>
            <p className="drag-drop-hint">🔗 Click "Create Pointer" in the Data Explorer to link to a specific view</p>
            
            {selectedPointers.length > 0 && (
              <>
                <label className="editor-label">View Pointers ({selectedPointers.length})</label>
                <div className="pointers-preview">
                  {selectedPointers.map((pointer, index) => (
                    <div key={index} className="pointer-preview-card">
                      <div className="pointer-preview-info">
                        <input
                          type="text"
                          className="pointer-title-input"
                          placeholder="Enter pointer title..."
                          value={pointerTitles[`${index}-title`] !== undefined ? pointerTitles[`${index}-title`] : (pointer.title || '')}
                          onChange={(e) => {
                            setPointerTitles(prev => ({
                              ...prev,
                              [`${index}-title`]: e.target.value
                            }));
                            const updatedPointers = [...selectedPointers];
                            updatedPointers[index] = {
                              ...updatedPointers[index],
                              title: e.target.value
                            };
                            setSelectedPointers(updatedPointers);
                          }}
                        />
                        <textarea
                          className="pointer-description-input"
                          placeholder="Enter pointer description (optional)..."
                          value={pointerDescriptions[`${index}-description`] !== undefined ? pointerDescriptions[`${index}-description`] : (pointer.description || '')}
                          onChange={(e) => {
                            setPointerDescriptions(prev => ({
                              ...prev,
                              [`${index}-description`]: e.target.value
                            }));
                            const updatedPointers = [...selectedPointers];
                            updatedPointers[index] = {
                              ...updatedPointers[index],
                              description: e.target.value
                            };
                            setSelectedPointers(updatedPointers);
                          }}
                          rows={2}
                        />
                        <div className="pointer-preview-details">
                          📊 {pointer.type ? (pointer.type.charAt(0).toUpperCase() + pointer.type.slice(1)) : 'View'}
                          {pointer.pointerData?.department && pointer.pointerData.department !== 'All' && 
                            ` • Dept: ${pointer.pointerData.department}`
                          }
                        </div>
                      </div>
                      <button
                        className="remove-pointer-button"
                        onClick={() => {
                          setSelectedPointers(selectedPointers.filter((_, i) => i !== index));
                          const newTitles = { ...pointerTitles };
                          delete newTitles[index];
                          setPointerTitles(newTitles);
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {pendingPointer && (isAdding || editingId) && (
              <p className="pointer-ready-hint">🔗 Pointer ready! It will be added when you save.</p>
            )}
            
            <div className="insight-actions">
              <button 
                className="insight-save-button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
              </button>
              <button 
                className="insight-cancel-button"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {insights.length === 0 && !isAdding && !editingId ? (
          <div className="insights-empty">
            <p>No insights yet. Click "+ Add Insight" to create one.</p>
          </div>
        ) : (
          <div className="insights-list">
            {insights.map((insight) => (
              <div 
                key={insight.id} 
                className="insight-card drop-zone"
                onDrop={(e) => {
                  e.currentTarget.removeAttribute('data-drag-over');
                  handleDrop(insight.id, e);
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="insight-card-header">
                  <div className="insight-header-content">
                    {insight.title && <h3 className="insight-title">{insight.title}</h3>}
                    <div className="insight-meta-line">
                      {insight.sensemakers && insight.sensemakers.length > 0 && (
                        <span className="insight-meta-text">
                          {insight.sensemakers.map(smId => {
                            const sm = sensemakers.find(s => s.id === smId);
                            return sm ? sm.name : smId;
                          }).join(', ')}
                        </span>
                      )}
                      {insight.departments && insight.departments.length > 0 && insight.sensemakers && insight.sensemakers.length > 0 && (
                        <span className="meta-separator"> • </span>
                      )}
                      {insight.departments && insight.departments.length > 0 && (
                        <span className="insight-meta-text">
                          {insight.departments.map(deptId => {
                            const dept = departments.find(d => d.id === deptId);
                            return dept ? dept.name : deptId;
                          }).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="insight-edit-button"
                    onClick={() => handleEdit(insight)}
                  >
                    Edit
                  </button>
                </div>
                
                <div className="insight-text">
                  {renderTextWithCitations(insight.notes, insight.comments)}
                </div>
                
                <div className="insight-footer">
                
                {insight.pointerIds && Array.isArray(insight.pointerIds) && insight.pointerIds.length > 0 ? (
                  <div className="insight-pointers-section">
                    <h4 className="pointers-section-title">View Pointers</h4>
                    <div className="insight-pointers">
                      {insight.pointerIds.map((pointerId) => {
                        const pointer = pointersData[pointerId];
                        if (!pointer) return null;
                        
                        const pointerData = pointer.pointerData || {};
                        const tabName = pointerData.tab || pointerData.type || 'View';
                        const displayName = tabName.charAt(0).toUpperCase() + tabName.slice(1);
                        const icon = pointerData.type === 'contract' ? '📄' : '📊';
                        
                        // Build filter info string
                        const filterParts = [];
                        if (pointerData.department && pointerData.department !== 'All') {
                          filterParts.push(pointerData.department);
                        }
                        if (pointerData.searchTerm) {
                          filterParts.push(`"${pointerData.searchTerm}"`);
                        }
                        if (pointerData.selectedEconomic && pointerData.selectedEconomic !== 'All') {
                          filterParts.push(pointerData.selectedEconomic);
                        }
                        if (pointerData.insightFilter && pointerData.insightFilter !== 'All') {
                          filterParts.push(`Insight: ${pointerData.insightFilter}`);
                        }
                        
                        // Heatmap-specific: sort information
                        if (pointerData.type === 'heatmap' && pointerData.sortColumn) {
                          const sortColumnName = pointerData.sortColumn === 'issue' ? 'Issue' :
                                                 pointerData.sortColumn === '0' ? 'Zero' :
                                                 pointerData.sortColumn === 'average' ? 'Average' :
                                                 pointerData.sortColumn === 'stdDev' ? 'Spread' :
                                                 pointerData.sortColumn === 'total' ? 'Total' :
                                                 `Rating ${pointerData.sortColumn}`;
                          const sortDir = pointerData.sortDirection === 'asc' ? '↑' : '↓';
                          filterParts.push(`Sort: ${sortColumnName} ${sortDir}`);
                        }
                        
                        // Comments-specific: issue/tag/insight filters
                        if (pointerData.type === 'comments') {
                          if (pointerData.selectedIssue && pointerData.selectedIssue !== 'All') {
                            filterParts.push(`Q: ${pointerData.selectedIssue}`);
                          }
                          if (pointerData.selectedTag && pointerData.selectedTag !== 'All') {
                            const tagLabel = pointerData.selectedTag === 'plus' ? '➕' :
                                           pointerData.selectedTag === 'delta' ? '🔺' :
                                           pointerData.selectedTag === 'star' ? '⭐' :
                                           pointerData.selectedTag === 'annotated' ? '💭' :
                                           pointerData.selectedTag;
                            filterParts.push(`Tag: ${tagLabel}`);
                          }
                          if (pointerData.selectedInsight && pointerData.selectedInsight !== 'All') {
                            filterParts.push(`Insight: ${pointerData.selectedInsight}`);
                          }
                        }
                        
                        if (pointerData.pageNumber) {
                          filterParts.push(`Page ${pointerData.pageNumber}`);
                        }
                        
                        return (
                          <div key={pointerId} className="pointer-with-download">
                            <button
                              className="insight-pointer-button"
                              onClick={() => onNavigateToPointer && onNavigateToPointer(pointerData)}
                              title={pointer.description || 'Click to navigate to this view'}
                            >
                              {icon} {pointer.title || `View ${displayName}`}
                              {filterParts.length > 0 && 
                                <span className="pointer-filter-info"> • {filterParts.join(' • ')}</span>
                              }
                            </button>
                            <button
                              className="download-pointer-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // First navigate to the view
                                if (onNavigateToPointer) {
                                  onNavigateToPointer(pointerData);
                                  // Wait a bit for the view to render, then download
                                  setTimeout(() => handleDownloadVisualization(pointer), 500);
                                }
                              }}
                              title="Download visualization as SVG"
                            >
                              ⬇️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                  
                  {insight.comments && insight.comments.length > 0 && (() => {
                    const citedIds = getCitedCommentIds(insight.notes);
                    const bankComments = insight.comments;
                    // Default to collapsed (true)
                    const isCollapsed = collapsedCommentBank[insight.id] !== false;
                    
                    return (
                      <div className="insight-section-collapsible">
                        <button 
                          className="section-toggle-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollapsedCommentBank(prev => ({
                              ...prev,
                              [insight.id]: prev[insight.id] === false ? true : false
                            }));
                          }}
                        >
                          <span className="meta-label">Comment Bank ({bankComments.length})</span>
                          <span className="toggle-icon-inline">
                            {isCollapsed ? '+' : '−'}
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="comment-bank-grid">
                            {bankComments.map(commentId => {
                              const commentEntry = Object.entries(commentsRecords).find(
                                ([, comment]) => comment.recordId === commentId
                              );
                              if (!commentEntry) return null;
                              
                              const [, commentData] = commentEntry;
                              const commentText = commentData.fullText || commentData.uniqueId?.split(' | ')[0] || '';
                              const isExpanded = expandedComments[commentId];
                              const isCited = citedIds.includes(commentId);
                              
                              return (
                                <div 
                                  key={commentId} 
                                  className={`comment-bank-card ${isExpanded ? 'expanded' : ''} ${isCited ? 'cited' : ''}`}
                                >
                                  <div 
                                    className="comment-bank-text"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCommentExpansion(commentId);
                                    }}
                                  >
                                    {isCited && <span className="cited-indicator" title="Cited in summary">💬</span>}
                                    <div className="comment-text-content">
                                      "{commentText}"
                                    </div>
                                    {!isExpanded && (
                                      <div className="expand-indicator">...</div>
                                    )}
                                  </div>
                                  <button
                                    className="remove-bank-comment"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveComment(insight.id, commentId);
                                    }}
                                    title="Remove from Comment Bank"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InsightsPanel;

