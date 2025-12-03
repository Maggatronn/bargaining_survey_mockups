import React from 'react';
import Airtable from 'airtable';
import { getQuestionColor, getQuestionColorClass, isOutlinedStyle } from '../utils/colorUtils';

function QualitativeResponses({ 
  filteredData,
  annotations,
  handleAnnotationChange,
  handleStarToggle,
  handleTagToggle,
  tagOptions = [],
  departmentMap,
  insights,
  commentsRecords,
  questions,
  selectedDepartment,
  searchTerm,
  selectedEconomic,
  selectedRespondent,
  currentSensemaker,
  sensemakers,
  selectedInsightFilter,
  setSelectedInsightFilter,
  onCreatePointer,
  activePointer
}) {
  // Custom nickname overrides
  const nicknameOverrides = {
    'New or existing benefits for equity and inclusivity': 'Equity + Inclusivity',
    'Other bargaining priority responses': 'Other Priorities'
  };
  
  // Get qualitative responses from Comments table
  const getQualitativeResponses = () => {
    const responses = [];
    
    // Create a map from question ID to economic classification
    const questionEconomicMap = {};
    questions.forEach(q => {
      questionEconomicMap[q.id] = q.economic;
    });
    
    // Convert commentsRecords object to array
    Object.entries(commentsRecords).forEach(([uniqueId, comment]) => {
      // Use override if available
      const displayName = nicknameOverrides[comment.questionName] || comment.questionName || comment.question;
      
      // Get economic classification from question
      const economic = questionEconomicMap[comment.question] || 'Unknown';
      
      responses.push({
        text: comment.fullText,
        columnHeader: comment.question,
        issue: displayName,
        issueNumber: comment.question,
        rating: 'N/A', // We can add this later if needed
        department: comment.department || 'Unknown',
        name: 'Anonymous', // We can add this from Survey Response link if needed
        uniqueId: uniqueId,
        questionId: comment.question,
        economic: economic // 'Economic' or 'Non-Economic'
      });
    });
    
    return responses;
  };

  const qualResponses = getQualitativeResponses();
  
  // State for filters
  const [selectedIssue, setSelectedIssue] = React.useState('All');
  const [selectedTag, setSelectedTag] = React.useState('All');
  const [showInsightTooltip, setShowInsightTooltip] = React.useState(null);
  const [showIndividualInfo, setShowIndividualInfo] = React.useState(null); // Track which comment's individual info is shown
  
  // Use prop for insight filter if provided, otherwise use local state
  const selectedInsight = selectedInsightFilter || 'All';
  const setSelectedInsight = React.useMemo(
    () => setSelectedInsightFilter || (() => {}),
    [setSelectedInsightFilter]
  );
  
  // Restore filter state from pointer
  React.useEffect(() => {
    if (activePointer && activePointer.type === 'comments') {
      if (activePointer.selectedIssue) {
        setSelectedIssue(activePointer.selectedIssue);
      }
      if (activePointer.selectedTag) {
        setSelectedTag(activePointer.selectedTag);
      }
      if (activePointer.selectedInsight) {
        setSelectedInsight(activePointer.selectedInsight);
      }
    }
  }, [activePointer, setSelectedInsight]);
  
  // State for pagination/virtual scrolling
  const [displayCount, setDisplayCount] = React.useState(50);
  const scrollContainerRef = React.useRef(null);
  
  // State for shuffle
  const [isShuffled, setIsShuffled] = React.useState(false);
  const [shuffledOrder, setShuffledOrder] = React.useState([]);
  
  // State for comment annotations
  const [commentAnnotations, setCommentAnnotations] = React.useState({});
  const [editingAnnotation, setEditingAnnotation] = React.useState(null);
  const [annotationText, setAnnotationText] = React.useState('');
  const [expandedAnnotations, setExpandedAnnotations] = React.useState({});
  
  // State for tag dropdown
  const [openTagDropdown, setOpenTagDropdown] = React.useState(null);
  
  // State for insight dropdown (mobile add to insight)
  const [openInsightDropdown, setOpenInsightDropdown] = React.useState(null);
  
  // Click outside handler to close dropdowns
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (openTagDropdown && !e.target.closest('.tag-dropdown-container')) {
        setOpenTagDropdown(null);
      }
      if (openInsightDropdown && !e.target.closest('.insight-add-dropdown-container')) {
        setOpenInsightDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openTagDropdown, openInsightDropdown]);
  
  // Helper function to get record ID for a comment
  const getCommentRecordId = (uniqueId) => {
    if (!commentsRecords || !commentsRecords[uniqueId]) return null;
    return commentsRecords[uniqueId].recordId;
  };

  // Fetch annotations from Airtable
  const fetchCommentAnnotations = React.useCallback(async () => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const annotationsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_CommentAnnotations;
    
    if (!apiKey || !baseId || !annotationsTable) return;
    
    const base = new Airtable({ apiKey }).base(baseId);
    
    try {
      const records = [];
      await base(annotationsTable)
        .select()
        .eachPage((pageRecords, fetchNextPage) => {
          records.push(...pageRecords);
          fetchNextPage();
        });
      
      // Group annotations by comment
      const annotationsByComment = {};
      
      records.forEach(record => {
        const commentIds = record.get('Comment') || [];
        const sensemakerIds = record.get('Sensemaker') || [];
        const annotationText = record.get('Annotation') || '';
        // Try to get created timestamp from Airtable's internal field
        const created = record._rawJson?.createdTime || new Date().toISOString();
        
        // Get sensemaker name
        const sensemakerId = sensemakerIds[0];
        const sensemaker = sensemakers?.find(s => s.id === sensemakerId);
        const sensemakerName = sensemaker?.name || 'Unknown';
        
        // Find the comment unique ID from the record ID
        commentIds.forEach(commentRecordId => {
          const commentEntry = Object.entries(commentsRecords).find(
            ([, comment]) => comment.recordId === commentRecordId
          );
          
          if (commentEntry) {
            const [uniqueId] = commentEntry;
            
            if (!annotationsByComment[uniqueId]) {
              annotationsByComment[uniqueId] = [];
            }
            
            annotationsByComment[uniqueId].push({
              id: record.id,
              text: annotationText,
              sensemakerId: sensemakerId,
              sensemakerName: sensemakerName,
              timestamp: created
            });
          }
        });
      });
      
      setCommentAnnotations(annotationsByComment);
      console.log('Fetched annotations for', Object.keys(annotationsByComment).length, 'comments');
    } catch (err) {
      console.error('Error fetching annotations:', err);
    }
  }, [commentsRecords, sensemakers]);

  // Fetch annotations on mount
  React.useEffect(() => {
    if (Object.keys(commentsRecords).length > 0 && sensemakers && sensemakers.length > 0) {
      fetchCommentAnnotations();
    }
  }, [commentsRecords, sensemakers, fetchCommentAnnotations]);

  // Helper function to get insights that cite a comment
  const getInsightsForComment = (uniqueId) => {
    const recordId = getCommentRecordId(uniqueId);
    if (!recordId || !insights) return [];
    
    return insights.filter(insight => 
      insight.comments && insight.comments.includes(recordId)
    );
  };

  // Handle annotation save
  const handleAnnotationSave = async (commentUniqueId) => {
    if (!currentSensemaker || !annotationText.trim()) return;
    
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const annotationsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_CommentAnnotations;
    
    if (!apiKey || !baseId || !annotationsTable) {
      console.error('Missing Airtable configuration for annotations');
      return;
    }
    
    const commentRecord = commentsRecords[commentUniqueId];
    if (!commentRecord) return;
    
    const base = new Airtable({ apiKey }).base(baseId);
    
    try {
      await base(annotationsTable).create({
        'Comment': [commentRecord.recordId],
        'Sensemaker': [currentSensemaker.id],
        'Annotation': annotationText.trim()
      });
      
      // Refetch annotations to get the latest data
      await fetchCommentAnnotations();
      
      setEditingAnnotation(null);
      setAnnotationText('');
    } catch (err) {
      console.error('Error saving annotation:', err);
    }
  };

  // Handle annotation delete
  const handleDeleteAnnotation = async (annotationRecordId) => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const annotationsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_CommentAnnotations;
    
    if (!apiKey || !baseId || !annotationsTable) {
      console.error('Missing Airtable configuration for annotations');
      return;
    }
    
    const base = new Airtable({ apiKey }).base(baseId);
    
    try {
      await base(annotationsTable).destroy(annotationRecordId);
      
      // Refetch annotations to get the latest data
      await fetchCommentAnnotations();
    } catch (err) {
      console.error('Error deleting annotation:', err);
      alert('Failed to delete annotation. Please try again.');
    }
  };

  // Filter qualitative responses by parent filters, issue, tag, and insight
  const filteredQualResponses = qualResponses.filter(response => {
    // Apply parent department filter
    if (selectedDepartment && selectedDepartment !== 'All') {
      const commentData = commentsRecords[response.uniqueId];
      if (commentData && commentData.department) {
        // Department is an array of linked record IDs
        if (Array.isArray(commentData.department)) {
          const deptNames = commentData.department.map(deptId => departmentMap[deptId]).filter(Boolean);
          if (!deptNames.includes(selectedDepartment)) {
            return false;
          }
        } else {
          // Single department ID
          const deptName = departmentMap[commentData.department];
          if (deptName !== selectedDepartment) {
            return false;
          }
        }
      } else {
        return false;
      }
    }
    
    // Apply parent search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      if (!response.text.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Apply parent economic filter
    if (selectedEconomic && selectedEconomic !== 'All') {
      if (response.economic !== selectedEconomic) {
        return false;
      }
    }
    
    // Apply parent respondent filter
    if (selectedRespondent && selectedRespondent !== 'All') {
      const commentData = commentsRecords[response.uniqueId];
      if (commentData) {
        const preferredName = commentData.preferredName || '';
        const mitEmail = commentData.mitEmail || '';
        const identifier = preferredName && mitEmail 
          ? `${preferredName} | ${mitEmail}`
          : preferredName || mitEmail;
        if (identifier !== selectedRespondent) {
          return false;
        }
      } else {
        return false;
      }
    }
    
    // Apply local issue filter
    if (selectedIssue !== 'All' && response.issue !== selectedIssue) {
      return false;
    }
    
    // Apply local tag filter
    if (selectedTag !== 'All') {
      const annotation = annotations[response.uniqueId] || [];
      const tagArray = Array.isArray(annotation) ? annotation : [annotation];
      const hasAnnotations = commentAnnotations[response.uniqueId] && commentAnnotations[response.uniqueId].length > 0;
      
      if (selectedTag === 'annotated' && !hasAnnotations) return false;
      else if (selectedTag === 'untagged' && tagArray.length > 0) return false;
      else if (selectedTag !== 'annotated' && selectedTag !== 'untagged') {
        // Check if the comment has the selected tag
        if (!tagArray.includes(selectedTag)) return false;
      }
    }
    
    // Apply local insight filter
    if (selectedInsight !== 'All') {
      const commentInsights = getInsightsForComment(response.uniqueId);
      if (selectedInsight === 'cited') {
        if (commentInsights.length === 0) return false;
      } else if (selectedInsight === 'uncited') {
        if (commentInsights.length > 0) return false;
      } else {
        // Specific insight selected
        if (!commentInsights.find(i => i.id === selectedInsight)) return false;
      }
    }
    return true;
  });

  // Get unique issues (using nicknames)
  const allIssues = ['All', ...new Set(qualResponses.map(r => r.issue))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  // Reset display count when filters change
  React.useEffect(() => {
    setDisplayCount(50);
  }, [selectedIssue, selectedTag, selectedInsight, selectedDepartment, searchTerm]);

  // Handle scroll for infinite loading
  const handleScroll = React.useCallback((e) => {
    const container = e.target;
    const scrollPosition = container.scrollTop + container.clientHeight;
    const scrollHeight = container.scrollHeight;
    
    // Load more when scrolled to 80% of the content
    if (scrollPosition >= scrollHeight * 0.8 && displayCount < filteredQualResponses.length) {
      setDisplayCount(prev => Math.min(prev + 50, filteredQualResponses.length));
    }
  }, [displayCount, filteredQualResponses.length]);

  // Reset shuffle when filters change
  React.useEffect(() => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledOrder([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredQualResponses.length, selectedIssue, selectedTag, selectedInsight]);

  // Shuffle function - always creates a new random order
  const handleShuffle = () => {
    // Create shuffled indices
    const indices = filteredQualResponses.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledOrder(indices);
    setIsShuffled(true);
    // Reset to show first 50
    setDisplayCount(50);
  };
  
  // Apply shuffle if active
  const orderedResponses = isShuffled 
    ? shuffledOrder.map(i => filteredQualResponses[i]).filter(Boolean)
    : filteredQualResponses;
  
  // Only display the first `displayCount` items
  const displayedResponses = orderedResponses.slice(0, displayCount);

  const handleCreatePointer = () => {
    if (onCreatePointer) {
      // Pass additional comments-specific state
      return onCreatePointer('comments', null, {
        selectedIssue,
        selectedTag,
        selectedInsight,
        selectedEconomic
      });
    }
  };

  // Calculate histogram data by theme
  const getHistogramData = () => {
    const themeData = {};
    
    filteredQualResponses.forEach(response => {
      const theme = response.issue || 'Unknown';
      if (!themeData[theme]) {
        themeData[theme] = { total: 0, plus: 0, delta: 0 };
      }
      themeData[theme].total++;
      
      // Check if comment has plus or delta tag
      const responseTags = annotations[response.uniqueId] || [];
      const tagArray = Array.isArray(responseTags) ? responseTags : [responseTags];
      if (tagArray.includes('plus')) {
        themeData[theme].plus++;
      } else if (tagArray.includes('delta')) {
        themeData[theme].delta++;
      }
    });
    
    // Convert to array and sort by total count
    return Object.entries(themeData)
      .map(([theme, data]) => ({
        theme,
        total: data.total,
        plus: data.plus,
        delta: data.delta,
        untagged: data.total - data.plus - data.delta
      }))
      .sort((a, b) => b.total - a.total);
  };

  const histogramData = getHistogramData();
  const maxCount = histogramData.length > 0 ? histogramData[0].total : 0;

  // Calculate summary stats for single question view
  const getSummaryStats = () => {
    let plusCount = 0;
    let deltaCount = 0;
    let starCount = 0;
    let citedCount = 0;
    let neutralCount = 0;

    filteredQualResponses.forEach(response => {
      const responseTags = annotations[response.uniqueId] || [];
      const tagArray = Array.isArray(responseTags) ? responseTags : [responseTags];
      
      if (tagArray.includes('plus')) plusCount++;
      if (tagArray.includes('delta')) deltaCount++;
      if (tagArray.includes('star')) starCount++;
      
      const commentInsights = getInsightsForComment(response.uniqueId);
      if (commentInsights.length > 0) citedCount++;
      
      // Neutral = no plus, delta, or star
      if (!tagArray.includes('plus') && !tagArray.includes('delta') && !tagArray.includes('star')) {
        neutralCount++;
      }
    });

    return {
      total: filteredQualResponses.length,
      plus: plusCount,
      delta: deltaCount,
      star: starCount,
      cited: citedCount,
      neutral: neutralCount
    };
  };

  const summaryStats = getSummaryStats();
  const showSummary = selectedIssue !== 'All';

  const handleDownload = () => {
    const targetElement = document.querySelector('.theme-histogram-vertical') || document.querySelector('.summary-stats-container');
    if (!targetElement) {
      alert('Could not find visualization to download');
      return;
    }
    
    const bbox = targetElement.getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;
    
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    
    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    
    const clone = targetElement.cloneNode(true);
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
    
    const filterParts = [];
    if (selectedIssue && selectedIssue !== 'All') {
      filterParts.push(selectedIssue.replace(/\s+/g, '-'));
    }
    if (selectedEconomic && selectedEconomic !== 'All') {
      filterParts.push(selectedEconomic.replace(/\s+/g, '-'));
    }
    const filterString = filterParts.length > 0 ? '_' + filterParts.join('_') : '';
    const filename = `comments${filterString}_${new Date().toISOString().split('T')[0]}.svg`;
    
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

  return (
    <div className="qualitative-container">
      <div className="section-header-with-filters">
        <div className="section-header-text">
          <h3 className="section-title">Qualitative Responses</h3>
          <p className="section-description">Open-ended feedback from survey participants</p>
        </div>
        <div className="section-header-buttons">
          <button className="snapshot-button" onClick={handleCreatePointer} title="Create pointer to this view">
            🔗 Create Pointer
          </button>
          <button className="snapshot-button" onClick={handleDownload} title="Download as SVG">
            ⬇️ Download
          </button>
        </div>
        
        <div className="qual-filters">
          <button 
            className="shuffle-button"
            onClick={handleShuffle}
            title="Shuffle comments randomly"
          >
            🔀 Shuffle
          </button>
          
          <div className="filter-group">
            <label>Question:</label>
            <select 
              value={selectedIssue} 
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="issue-select"
            >
              {allIssues.map((issue, index) => (
                <option key={`issue-${index}`} value={issue} className={`issue-option issue-${issue.replace(' ', '-')}`}>
                  {issue}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Tag:</label>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="All">All</option>
              {tagOptions.map(tag => (
                <option key={tag.key} value={tag.key}>
                  {tag.emoji} {tag.title}
                </option>
              ))}
              <option value="annotated">💭 Annotated</option>
              <option value="untagged">— Untagged</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Insight:</label>
            <select value={selectedInsight} onChange={(e) => setSelectedInsight(e.target.value)}>
              <option value="All">All</option>
              <option value="cited">💡 Cited</option>
              <option value="uncited">— Uncited</option>
              {insights && insights.map(insight => (
                <option key={insight.id} value={insight.id}>
                  {insight.title || insight.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="qual-count">
            {filteredQualResponses.length} of {qualResponses.length}
          </div>
        </div>
      </div>

      {/* Theme Histogram or Summary Stats */}
      {showSummary ? (
        <div className="question-summary-stats">
          <div className="summary-stat">
            <div className="summary-stat-value">{summaryStats.total}</div>
            <div className="summary-stat-label">Total</div>
          </div>
          <div className="summary-stat summary-stat-plus">
            <div className="summary-stat-value">➕ {summaryStats.plus}</div>
            <div className="summary-stat-label">Plus</div>
          </div>
          <div className="summary-stat summary-stat-delta">
            <div className="summary-stat-value">🔺 {summaryStats.delta}</div>
            <div className="summary-stat-label">Delta</div>
          </div>
          <div className="summary-stat summary-stat-neutral">
            <div className="summary-stat-value">{summaryStats.neutral}</div>
            <div className="summary-stat-label">Neutral</div>
          </div>
          <div className="summary-stat summary-stat-cited">
            <div className="summary-stat-value">💡 {summaryStats.cited}</div>
            <div className="summary-stat-label">Cited</div>
          </div>
          <div className="summary-stat summary-stat-star">
            <div className="summary-stat-value">⭐ {summaryStats.star}</div>
            <div className="summary-stat-label">Starred</div>
          </div>
        </div>
      ) : (
        <div className="theme-histogram-vertical">
          {histogramData.map((item, index) => {
          const barHeight = maxCount > 0 ? (item.total / maxCount) * 100 : 0;
          const plusPercent = item.total > 0 ? (item.plus / item.total) * 100 : 0;
          const deltaPercent = item.total > 0 ? (item.delta / item.total) * 100 : 0;
          const untaggedPercent = item.total > 0 ? (item.untagged / item.total) * 100 : 0;
          
          // Get the question ID and economic classification for this theme
          const matchingResponse = filteredQualResponses.find(r => r.issue === item.theme);
          const questionId = matchingResponse?.questionId || '';
          const economic = matchingResponse?.economic || 'Unknown';
          const themeColor = getQuestionColor(questionId, economic);
          const isNonEconomic = isOutlinedStyle(economic);
          
          // Convert hex to rgba for 50% opacity stripes
          const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };
          
          // Create abbreviated label (first 3 words or first 15 chars)
          const words = item.theme.split(' ');
          const abbreviatedLabel = words.length > 3 
            ? words.slice(0, 3).join(' ') + '...'
            : item.theme.length > 15
              ? item.theme.substring(0, 15) + '...'
              : item.theme;
          
          return (
            <div 
              key={index} 
              className="histogram-column"
              title={item.theme}
              onClick={() => alert(item.theme)}
            >
              <div className="histogram-bar-vertical" style={{ height: `${barHeight}%` }}>
                {item.delta > 0 && (
                  <div 
                    className="histogram-segment-vertical histogram-delta-vertical" 
                    style={{ height: `${deltaPercent}%` }}
                  />
                )}
                {item.plus > 0 && (
                  <div 
                    className="histogram-segment-vertical histogram-plus-vertical" 
                    style={{ height: `${plusPercent}%` }}
                  />
                )}
                {item.untagged > 0 && (
                  <div 
                    className={`histogram-segment-vertical histogram-theme-vertical ${isNonEconomic ? 'striped' : ''}`}
                    style={{ 
                      height: `${untaggedPercent}%`,
                      background: isNonEconomic 
                          ? `repeating-linear-gradient(45deg, ${hexToRgba(themeColor, 0.8)}, ${hexToRgba(themeColor, 0.8)} 4px, ${themeColor} 4px, ${themeColor} 8px)`
                          : themeColor,
                      border: isNonEconomic ? `2px solid ${themeColor}` : 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>
              <div className="histogram-label-vertical">{abbreviatedLabel}</div>
              <div className="histogram-count-vertical">{item.total}</div>
            </div>
          );
        })}
        </div>
      )}

      <div 
        className="qual-responses-grid" 
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {displayedResponses.map((response, index) => {
          const responseTags = annotations[response.uniqueId] || [];
          const tagArray = Array.isArray(responseTags) ? responseTags : [responseTags];
          const commentInsights = getInsightsForComment(response.uniqueId);
          const isCited = commentInsights.length > 0;
          const isTagDropdownOpen = openTagDropdown === response.uniqueId;
          
          // Get department name from ID if available
          let departmentName = response.department;
          if (departmentMap && response.department) {
            // Check if it's an array of IDs
            if (Array.isArray(response.department)) {
              departmentName = response.department
                .map(deptId => departmentMap[deptId] || deptId)
                .join(', ');
            } else {
              // Single ID
              departmentName = departmentMap[response.department] || response.department;
            }
          }
          
          // Get selected tag details for display
          const selectedTagDetails = tagArray
            .map(tagKey => tagOptions.find(t => t.key === tagKey))
            .filter(Boolean);
          
          return (
          <div 
            key={index} 
            className={`qual-card ${isTagDropdownOpen ? 'has-open-dropdown' : ''}`}
          >
            <div 
              className="qual-text"
              style={{ userSelect: 'text', cursor: 'text' }}
            >
              "{response.text}"
            </div>
            
            
            <div 
              className="qual-footer"
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData('commentId', response.uniqueId);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              style={{ cursor: 'grab' }}
            >
              <div className="qual-footer-left">
                <button
                  className="info-button"
                  onClick={() => {
                    setShowIndividualInfo(showIndividualInfo === response.uniqueId ? null : response.uniqueId);
                  }}
                  title="Show individual information"
                >
                  <span className="info-icon">i</span>
                </button>
                <span className={`tag-issue ${getQuestionColorClass(response.questionId, response.economic)}`}>
                  {response.issue}
                </span>
                {response.rating !== 'N/A' && (
                  <div className="qual-meta">
                    <span className="meta-text">Rating: {response.rating}</span>
                  </div>
                )}
              </div>
              <div className="qual-actions">
                {isCited && (
                  <div 
                    className="insight-indicator"
                    onMouseEnter={() => setShowInsightTooltip(response.uniqueId)}
                    onMouseLeave={() => setShowInsightTooltip(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInsightTooltip(showInsightTooltip === response.uniqueId ? null : response.uniqueId);
                    }}
                  >
                    💡
                    {showInsightTooltip === response.uniqueId && (
                      <div className="insight-tooltip">
                        <div className="tooltip-header">Cited in:</div>
                        {commentInsights.map(insight => (
                          <div key={insight.id} className="tooltip-insight">
                            {insight.title || insight.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Multi-select tag dropdown */}
                <div className={`tag-dropdown-container ${isTagDropdownOpen ? 'is-open' : ''}`}>
                  <button
                    className={`tag-dropdown-trigger ${tagArray.length > 0 ? 'has-tags' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTagDropdown(isTagDropdownOpen ? null : response.uniqueId);
                    }}
                    title="Add/remove tags"
                  >
                    {selectedTagDetails.length > 0 ? (
                      <span className="selected-tags-inline">
                        {selectedTagDetails.map(tag => (
                          <span key={tag.key} className="selected-tag-emoji" title={tag.title}>
                            {tag.emoji}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="tag-icon-default">🏷️</span>
                    )}
                  </button>
                  
                  {isTagDropdownOpen && (
                    <div className="tag-dropdown-menu">
                      <div className="tag-dropdown-header">Select Tags</div>
                      {tagOptions.map(tag => (
                        <label 
                          key={tag.key} 
                          className={`tag-dropdown-option ${tagArray.includes(tag.key) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={tagArray.includes(tag.key)}
                            onChange={() => handleTagToggle(response.uniqueId, tag.key)}
                          />
                          <span className="tag-option-emoji">{tag.emoji}</span>
                          <span className="tag-option-title">{tag.title}</span>
                        </label>
                      ))}
                      <button 
                        className="tag-dropdown-close"
                        onClick={() => setOpenTagDropdown(null)}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                
                {currentSensemaker && (
                  <button
                    className="annotation-button"
                    onClick={() => {
                      if (editingAnnotation === response.uniqueId) {
                        setEditingAnnotation(null);
                        setAnnotationText('');
                      } else {
                        setEditingAnnotation(response.uniqueId);
                        setAnnotationText('');
                      }
                    }}
                    title="Add new annotation"
                  >
                    💭
                  </button>
                )}
                
                {/* Lightbulb - add to insight dropdown */}
                <div className={`insight-add-dropdown-container ${openInsightDropdown === response.uniqueId ? 'is-open' : ''}`}>
                  <button
                    className={`insight-add-trigger ${isCited ? 'is-cited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenInsightDropdown(openInsightDropdown === response.uniqueId ? null : response.uniqueId);
                    }}
                    title={isCited ? "Already cited in insight(s)" : "Add to insight"}
                  >
                    💡
                  </button>
                  
                  {openInsightDropdown === response.uniqueId && (
                    <div className="insight-add-dropdown-menu">
                      <div className="insight-dropdown-header">Add to Insight</div>
                      {insights && insights.length > 0 ? (
                        insights.map(insight => {
                          const isInInsight = commentInsights.some(ci => ci.id === insight.id);
                          return (
                            <label 
                              key={insight.id} 
                              className={`insight-dropdown-option ${isInInsight ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isInInsight}
                                onChange={async () => {
                                  // Toggle comment in insight
                                  const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
                                  const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
                                  const insightsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Insights;
                                  if (!apiKey || !baseId || !insightsTable) return;
                                  
                                  const base = new Airtable({ apiKey }).base(baseId);
                                  const commentRecordId = getCommentRecordId(response.uniqueId);
                                  if (!commentRecordId) return;
                                  
                                  try {
                                    const currentCitations = insight.citations || [];
                                    let newCitations;
                                    if (isInInsight) {
                                      newCitations = currentCitations.filter(id => id !== commentRecordId);
                                    } else {
                                      newCitations = [...currentCitations, commentRecordId];
                                    }
                                    
                                    await base(insightsTable).update(insight.id, {
                                      'Citations': newCitations
                                    });
                                    
                                    // Refresh the page to update
                                    window.location.reload();
                                  } catch (error) {
                                    console.error('Error updating insight:', error);
                                  }
                                }}
                              />
                              <span className="insight-option-title">{insight.title || insight.name || 'Untitled Insight'}</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="no-insights-message">No insights created yet</div>
                      )}
                      <button 
                        className="insight-dropdown-close"
                        onClick={() => setOpenInsightDropdown(null)}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {showIndividualInfo === response.uniqueId && (() => {
              const commentData = commentsRecords[response.uniqueId];
              const preferredName = commentData?.preferredName || '';
              const mitEmail = commentData?.mitEmail || '';
              
              return (
                <div className="individual-info">
                  <div className="individual-info-content">
                    {departmentName && (
                      <>
                        <span className="individual-department">{departmentName}</span>
                        {(preferredName || mitEmail) && <span className="individual-separator"> | </span>}
                      </>
                    )}
                    {preferredName && <span className="individual-name">{preferredName}</span>}
                    {preferredName && mitEmail && <span className="individual-separator"> | </span>}
                    {mitEmail && <a href={`mailto:${mitEmail}`} className="individual-email">{mitEmail}</a>}
                    {!departmentName && !preferredName && !mitEmail && (
                      <span className="individual-none">No additional information available</span>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {editingAnnotation === response.uniqueId && (
              <div className="annotation-editor">
                <textarea
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Add your annotation..."
                  className="annotation-textarea"
                  rows={3}
                  autoFocus
                />
                <div className="annotation-actions">
                  <button
                    className="annotation-save"
                    onClick={() => handleAnnotationSave(response.uniqueId)}
                    disabled={!annotationText.trim()}
                  >
                    Save
                  </button>
                  <button
                    className="annotation-cancel"
                    onClick={() => {
                      setEditingAnnotation(null);
                      setAnnotationText('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {commentAnnotations[response.uniqueId] && commentAnnotations[response.uniqueId].length > 0 && (
              <div className="comment-annotations-section">
                <button
                  className="annotations-toggle-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Toggling annotations for', response.uniqueId, 'Current state:', expandedAnnotations[response.uniqueId]);
                    setExpandedAnnotations(prev => ({
                      ...prev,
                      [response.uniqueId]: !prev[response.uniqueId]
                    }));
                  }}
                >
                  <span>View Annotations ({commentAnnotations[response.uniqueId].length})</span>
                  <span className="toggle-icon">{expandedAnnotations[response.uniqueId] ? '−' : '+'}</span>
                </button>
                {expandedAnnotations[response.uniqueId] && (
                  <div className="comment-annotations-list">
                    {commentAnnotations[response.uniqueId].map((annot, idx) => (
                      <div key={idx} className="annotation-item">
                        <div className="annotation-content">
                          <div className="annotation-text">{annot.text}</div>
                          <div className="annotation-meta">
                            <span className="annotation-author">{annot.sensemakerName}</span>
                            <span className="annotation-separator"> • </span>
                            <span className="annotation-date">{new Date(annot.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          className="annotation-delete-button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this annotation?')) {
                              await handleDeleteAnnotation(annot.id);
                            }
                          }}
                          title="Delete annotation"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
        
        {displayCount < filteredQualResponses.length && (
          <div className="loading-more">
            <p>Showing {displayCount} of {filteredQualResponses.length} comments. Scroll to load more...</p>
          </div>
        )}
      </div>

      {filteredQualResponses.length === 0 && (
        <div className="no-results">
          <p>No qualitative responses match the selected filters.</p>
        </div>
      )}
    </div>
  );
}

export default QualitativeResponses;

