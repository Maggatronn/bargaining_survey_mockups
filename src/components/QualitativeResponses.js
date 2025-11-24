import React from 'react';
import Airtable from 'airtable';

function QualitativeResponses({ 
  filteredData,
  annotations,
  handleAnnotationChange,
  handleStarToggle,
  departmentMap,
  insights,
  commentsRecords,
  questions,
  selectedDepartment,
  searchTerm,
  currentSensemaker,
  sensemakers,
  selectedInsightFilter,
  setSelectedInsightFilter,
  onCreatePointer
}) {
  // Custom nickname overrides
  const nicknameOverrides = {
    'New or existing benefits for equity and inclusivity': 'Equity + Inclusivity',
    'Other bargaining priority responses': 'Other Priorities'
  };
  
  // Get qualitative responses from Comments table
  const getQualitativeResponses = () => {
    const responses = [];
    
    // Convert commentsRecords object to array
    Object.entries(commentsRecords).forEach(([uniqueId, comment]) => {
      // Use override if available
      const displayName = nicknameOverrides[comment.questionName] || comment.questionName || comment.question;
      
      responses.push({
        text: comment.fullText,
        columnHeader: comment.question,
        issue: displayName,
        issueNumber: comment.question,
        rating: 'N/A', // We can add this later if needed
        department: comment.department || 'Unknown',
        name: 'Anonymous', // We can add this from Survey Response link if needed
        uniqueId: uniqueId,
        questionId: comment.question
      });
    });
    
    return responses;
  };

  const qualResponses = getQualitativeResponses();
  
  // State for filters
  const [selectedIssue, setSelectedIssue] = React.useState('All');
  const [selectedTag, setSelectedTag] = React.useState('All');
  const [showInsightTooltip, setShowInsightTooltip] = React.useState(null);
  
  // Use prop for insight filter if provided, otherwise use local state
  const selectedInsight = selectedInsightFilter || 'All';
  const setSelectedInsight = setSelectedInsightFilter || (() => {});
  
  // State for pagination/virtual scrolling
  const [displayCount, setDisplayCount] = React.useState(50);
  const scrollContainerRef = React.useRef(null);
  
  // State for comment annotations
  const [commentAnnotations, setCommentAnnotations] = React.useState({});
  const [editingAnnotation, setEditingAnnotation] = React.useState(null);
  const [annotationText, setAnnotationText] = React.useState('');
  const [expandedAnnotations, setExpandedAnnotations] = React.useState({});
  
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
    
    // Apply local issue filter
    if (selectedIssue !== 'All' && response.issue !== selectedIssue) {
      return false;
    }
    
    // Apply local tag filter
    if (selectedTag !== 'All') {
      const annotation = annotations[response.uniqueId] || [];
      const tagArray = Array.isArray(annotation) ? annotation : [annotation];
      const hasAnnotations = commentAnnotations[response.uniqueId] && commentAnnotations[response.uniqueId].length > 0;
      
      if (selectedTag === 'plus' && !tagArray.includes('plus')) return false;
      if (selectedTag === 'delta' && !tagArray.includes('delta')) return false;
      if (selectedTag === 'star' && !tagArray.includes('star')) return false;
      if (selectedTag === 'annotated' && !hasAnnotations) return false;
      if (selectedTag === 'untagged' && tagArray.length > 0) return false;
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

  // Only display the first `displayCount` items
  const displayedResponses = filteredQualResponses.slice(0, displayCount);

  const handleCreatePointer = () => {
    if (onCreatePointer) {
      return onCreatePointer('comments');
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

  return (
    <div className="qualitative-container">
      <div className="section-header-with-filters">
        <div className="section-header-text">
          <h3 className="section-title">Qualitative Responses</h3>
          <p className="section-description">Open-ended feedback from survey participants</p>
        </div>
        <button className="snapshot-button" onClick={handleCreatePointer} title="Create pointer to this view">
          🔗 Create Pointer
        </button>
        
        <div className="qual-filters">
          <div className="filter-group">
            <label>Question:</label>
            <select 
              value={selectedIssue} 
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="issue-select"
            >
              {allIssues.map(issue => (
                <option key={issue} value={issue} className={`issue-option issue-${issue.replace(' ', '-')}`}>
                  {issue}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Tag:</label>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="All">All</option>
              <option value="plus">➕ Plus</option>
              <option value="delta">🔺 Delta</option>
              <option value="star">⭐ Star</option>
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
          
          // Get the question ID for this theme to use for coloring
          const matchingResponse = filteredQualResponses.find(r => r.issue === item.theme);
          const questionId = matchingResponse?.questionId || '';
          const themeClass = questionId ? `issue-${questionId}` : '';
          
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
                    className={`histogram-segment-vertical histogram-theme-vertical ${themeClass}`}
                    style={{ height: `${untaggedPercent}%` }}
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
          const plusDeltaTag = tagArray.find(t => t === 'plus' || t === 'delta') || '';
          const isStarred = tagArray.includes('star');
          const commentInsights = getInsightsForComment(response.uniqueId);
          const isCited = commentInsights.length > 0;
          
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
          
          return (
          <div 
            key={index} 
            className="qual-card"
            draggable="true"
            onDragStart={(e) => {
              e.dataTransfer.setData('commentId', response.uniqueId);
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <div className="qual-text">
              "{response.text}"
            </div>
            
            <div className="qual-footer">
              <div className="qual-footer-left">
                <span className={`tag-issue issue-${response.questionId || response.columnHeader.replace(' ', '-')}`}>
                  {response.issue}
                </span>
                <div className="qual-meta">
                  {response.rating !== 'N/A' && (
                    <span className="meta-text">Rating: {response.rating}</span>
                  )}
                  <span className="meta-text">{departmentName}</span>
                </div>
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
                <button 
                  className={`star-button ${isStarred ? 'starred' : ''}`}
                  onClick={() => handleStarToggle(response.uniqueId)}
                  title={isStarred ? 'Remove star' : 'Add star'}
                >
                  {isStarred ? '⭐' : '☆'}
                </button>
                <select 
                  className="annotation-dropdown"
                  value={plusDeltaTag}
                  onChange={(e) => handleAnnotationChange(response.uniqueId, e.target.value)}
                >
                  <option value="">—</option>
                  <option value="plus">➕</option>
                  <option value="delta">🔺</option>
                </select>
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
              </div>
            </div>
            
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
                        <div className="annotation-text">{annot.text}</div>
                        <div className="annotation-meta">
                          <span className="annotation-author">{annot.sensemakerName}</span>
                          <span className="annotation-separator"> • </span>
                          <span className="annotation-date">{new Date(annot.timestamp).toLocaleDateString()}</span>
                        </div>
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

