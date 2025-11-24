import React, { useState, useEffect } from 'react';
import Airtable from 'airtable';

function InsightsPanel({ data, commentsRecords, annotations, pendingSnapshot, onSnapshotUsed }) {
  const [insights, setInsights] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newInsightTitle, setNewInsightTitle] = useState('');
  const [newInsightText, setNewInsightText] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedComments, setSelectedComments] = useState([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedInsightComments, setExpandedInsightComments] = useState({});
  const [hoveredCitation, setHoveredCitation] = useState(null);
  const [expandedCitations, setExpandedCitations] = useState({});

  useEffect(() => {
    fetchDepartments();
    fetchInsights();
  }, []);

  // Handle pending snapshot
  useEffect(() => {
    if (pendingSnapshot && (isAdding || editingId)) {
      // Add snapshot to current insight being edited
      setSelectedSnapshots(prev => [...prev, pendingSnapshot]);
      if (onSnapshotUsed) onSnapshotUsed();
    }
  }, [pendingSnapshot, isAdding, editingId, onSnapshotUsed]);

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
            records.push({
              id: record.id,
              name: record.fields.Name,
              title: record.fields.Title || '',
              notes: record.fields.Notes,
              departments: record.fields.Departments || [],
              comments: record.fields.Comments || [],
              snapshots: record.fields.Snapshots ? JSON.parse(record.fields.Snapshots) : []
            });
          });
          fetchNextPage();
        });
      
      setInsights(records);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setLoading(false);
    }
  };

  const handleAddInsight = () => {
    setIsAdding(true);
    setEditingId(null);
    setNewInsightTitle('');
    setNewInsightText('');
    setSelectedDepartments([]);
    setSelectedComments([]);
    setSelectedSnapshots([]);
  };

  const handleEdit = (insight) => {
    console.log('Editing insight:', insight);
    console.log('Insight departments:', insight.departments);
    setEditingId(insight.id);
    setNewInsightTitle(insight.title || '');
    setNewInsightText(insight.notes || '');
    // Ensure departments and comments are arrays of IDs
    setSelectedDepartments(Array.isArray(insight.departments) ? insight.departments : []);
    setSelectedComments(Array.isArray(insight.comments) ? insight.comments : []);
    setSelectedSnapshots(Array.isArray(insight.snapshots) ? insight.snapshots : []);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewInsightTitle('');
    setNewInsightText('');
    setSelectedDepartments([]);
    setSelectedComments([]);
    setSelectedSnapshots([]);
  };
  
  
  const toggleComment = (commentId) => {
    if (selectedComments.includes(commentId)) {
      setSelectedComments(selectedComments.filter(c => c !== commentId));
    } else {
      setSelectedComments([...selectedComments, commentId]);
    }
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
      console.log('Comment already linked to this insight');
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
      
      console.log('Comment linked successfully!');
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

  const toggleInsightComments = (insightId) => {
    setExpandedInsightComments(prev => ({
      ...prev,
      [insightId]: !prev[insightId]
    }));
  };

  const handleTextareaDrop = (e) => {
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
    
    // Add to selected comments if not already there
    if (!selectedComments.includes(recordId)) {
      setSelectedComments([...selectedComments, recordId]);
    }
    
    // Insert citation at cursor position
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBefore = newInsightText.substring(0, cursorPos);
    const textAfter = newInsightText.substring(cursorPos);
    const citation = `[[${recordId}]]`;
    
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

  // Helper to get issue color class from uniqueId
  const getIssueColorClass = (uniqueId) => {
    if (!uniqueId) return '';
    const parts = uniqueId.split(' | ');
    if (parts.length < 2) return '';
    const issue = parts[1].replace(' ', '-');
    return `issue-${issue}`;
  };

  // Render textarea content with inline comment previews
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
        const issueColorClass = `issue-${commentData.question || 'unknown'}`;
        
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

  // Parse text and render inline citations
  const renderTextWithCitations = (text, insightComments) => {
    if (!text) return '';
    
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
        recordId: recordId
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
        const issueColorClass = getIssueColorClass(uniqueId);
        
        // Get tags from annotations
        const responseTags = (annotations && annotations[uniqueId]) || [];
        const tagArray = Array.isArray(responseTags) 
          ? responseTags.filter(t => t && t !== '') 
          : (responseTags && responseTags !== '' ? [responseTags] : []);
        const plusDeltaTag = tagArray.find(t => t === 'plus' || t === 'delta');
        
        // Get department and question from uniqueId
        const parts = uniqueId.split(' | ');
        const question = parts[1] || 'Unknown';
        
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
                  <div><strong>Question:</strong> {question}</div>
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
      if (editingId) {
        // Update existing insight
        const updatedRecord = await base(insightTable).update(editingId, {
          Title: newInsightTitle.trim(),
          Notes: newInsightText.trim(),
          Departments: selectedDepartments,
          Comments: selectedComments,
          Snapshots: JSON.stringify(selectedSnapshots)
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
                snapshots: updatedRecord.fields.Snapshots ? JSON.parse(updatedRecord.fields.Snapshots) : []
              }
            : insight
        ));
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
          Snapshots: JSON.stringify(selectedSnapshots)
        });

        // Add to local state
        setInsights([...insights, {
          id: newRecord.id,
          name: newRecord.fields.Name,
          title: newRecord.fields.Title,
          notes: newRecord.fields.Notes,
          departments: newRecord.fields.Departments || [],
          comments: newRecord.fields.Comments || [],
          snapshots: newRecord.fields.Snapshots ? JSON.parse(newRecord.fields.Snapshots) : []
        }]);
      }

      // Reset form
      setIsAdding(false);
      setEditingId(null);
      setNewInsightTitle('');
      setNewInsightText('');
      setSelectedDepartments([]);
      setSelectedComments([]);
      setSelectedSnapshots([]);
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
          <div className="insight-editor">
            <label className="editor-label">Title</label>
            <input
              type="text"
              className="insight-title-input"
              placeholder="Enter insight title..."
              value={newInsightTitle}
              onChange={(e) => setNewInsightTitle(e.target.value)}
              autoFocus
            />
            
            <label className="editor-label">
              Insight Text
              <span className="editor-hint">💡 Drag comments from the right panel to cite them inline</span>
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
            {newInsightText && newInsightText.includes('[[') && (
              <div className="insight-text-preview">
                <div className="preview-label">Preview:</div>
                <div className="preview-content">
                  {renderTextareaContent(newInsightText)}
                </div>
              </div>
            )}
            
            <label className="editor-label">Link to Departments</label>
            <select
              multiple
              className="department-multiselect"
              value={selectedDepartments}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions);
                const values = options.map(option => option.value);
                setSelectedDepartments(values);
              }}
              size={Math.min(departments.length, 6)}
            >
              {departments.length === 0 ? (
                <option disabled>Loading departments...</option>
              ) : (
                departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))
              )}
            </select>
            <p className="editor-hint-small">Hold Cmd/Ctrl to select multiple departments</p>
            
            {selectedComments.length > 0 && (
              <>
                <label className="editor-label">Linked Comments ({selectedComments.length})</label>
                <div className="linked-comments-preview">
                  {selectedComments.map(commentId => {
                    // Find the comment in commentsRecords
                    const commentEntry = Object.entries(commentsRecords).find(
                      ([, comment]) => comment.recordId === commentId
                    );
                    if (!commentEntry) return null;
                    
                    const [uniqueId] = commentEntry;
                    const commentText = uniqueId.split(' | ')[0];
                    
                    return (
                      <div key={commentId} className="linked-comment-mini">
                        <span className="comment-text-mini">{commentText}</span>
                        <button
                          className="remove-comment-button"
                          onClick={() => toggleComment(commentId)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <p className="drag-drop-hint">💡 Drag comment cards from the right panel to link them to this insight</p>
            
            {selectedSnapshots.length > 0 && (
              <>
                <label className="editor-label">Snapshots ({selectedSnapshots.length})</label>
                <div className="snapshots-preview">
                  {selectedSnapshots.map((snapshot, index) => (
                    <div key={index} className="snapshot-preview-card">
                      <img src={snapshot.imageData} alt={snapshot.title} className="snapshot-preview-image" />
                      <div className="snapshot-preview-info">
                        <div className="snapshot-preview-title">{snapshot.title}</div>
                        <div className="snapshot-preview-timestamp">{snapshot.timestamp}</div>
                      </div>
                      <button
                        className="remove-snapshot-button"
                        onClick={() => setSelectedSnapshots(selectedSnapshots.filter((_, i) => i !== index))}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {pendingSnapshot && (isAdding || editingId) && (
              <p className="snapshot-ready-hint">📷 Snapshot ready! It will be added when you save.</p>
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
                  <div className="insight-header-left">
                    {insight.title && <h3 className="insight-title">{insight.title}</h3>}
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
                
                {insight.snapshots && insight.snapshots.length > 0 && (
                  <div className="insight-snapshots">
                    {insight.snapshots.map((snapshot, index) => (
                      <div key={index} className="insight-snapshot">
                        <img src={snapshot.imageData} alt={snapshot.title} className="snapshot-image" />
                        <div className="snapshot-caption">
                          <strong>{snapshot.title}</strong>
                          <span className="snapshot-timestamp">{snapshot.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="insight-footer">
                  {insight.departments && insight.departments.length > 0 && (
                    <div className="insight-meta-inline">
                      <span className="meta-label">Departments:</span>
                      <span className="meta-value">
                        {insight.departments.map(deptId => {
                          const dept = departments.find(d => d.id === deptId);
                          return dept ? dept.name : deptId;
                        }).join(', ')}
                      </span>
                    </div>
                  )}
                  {insight.comments && insight.comments.length > 0 && (
                    <div className="linked-comments-section-inline">
                      <button 
                        className="linked-comments-toggle-inline"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleInsightComments(insight.id);
                        }}
                      >
                        <span className="meta-label">Cited Comments ({insight.comments.length})</span>
                        <span className="toggle-icon-inline">
                          {expandedInsightComments[insight.id] ? '−' : '+'}
                        </span>
                      </button>
                    {expandedInsightComments[insight.id] && (
                      <div className="linked-comments-grid">
                        {insight.comments.map(commentId => {
                          // Find the comment in commentsRecords
                          const commentEntry = Object.entries(commentsRecords).find(
                            ([, comment]) => comment.recordId === commentId
                          );
                          if (!commentEntry) return null;
                          
                          const [, commentData] = commentEntry;
                          const commentText = commentData.fullText || commentData.uniqueId?.split(' | ')[0] || '';
                          const isExpanded = expandedComments[commentId];
                          
                          return (
                            <div 
                              key={commentId} 
                              className={`linked-comment-card ${isExpanded ? 'expanded' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCommentExpansion(commentId);
                              }}
                            >
                              <div className="comment-text-content">
                                "{commentText}"
                              </div>
                              {!isExpanded && (
                                <div className="expand-indicator">...</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  )}
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

