import React from 'react';

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
  searchTerm
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
  const [selectedInsight, setSelectedInsight] = React.useState('All');
  const [showInsightTooltip, setShowInsightTooltip] = React.useState(null);
  
  // State for pagination/virtual scrolling
  const [displayCount, setDisplayCount] = React.useState(50);
  const scrollContainerRef = React.useRef(null);
  
  // Helper function to get record ID for a comment
  const getCommentRecordId = (uniqueId) => {
    if (!commentsRecords || !commentsRecords[uniqueId]) return null;
    return commentsRecords[uniqueId].recordId;
  };

  // Helper function to get insights that cite a comment
  const getInsightsForComment = (uniqueId) => {
    const recordId = getCommentRecordId(uniqueId);
    if (!recordId || !insights) return [];
    
    return insights.filter(insight => 
      insight.comments && insight.comments.includes(recordId)
    );
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
      if (selectedTag === 'plus' && !tagArray.includes('plus')) return false;
      if (selectedTag === 'delta' && !tagArray.includes('delta')) return false;
      if (selectedTag === 'star' && !tagArray.includes('star')) return false;
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

  return (
    <div className="qualitative-container">
      <div className="section-header-with-filters">
        <div className="section-header-text">
          <h3 className="section-title">Qualitative Responses</h3>
          <p className="section-description">Open-ended feedback from survey participants</p>
        </div>
        
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
              </div>
            </div>
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

