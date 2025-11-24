import React from 'react';

function Heatmap({ filteredData, onCreatePointer, questions }) {
  
  // Calculate heatmap data using questions config
  const calculateHeatmapData = () => {
    const heatmapData = [];
    
    // Questions to exclude from heatmap (by ID)
    const excludedQuestionIds = ['open1', 'open2'];
    
    // Get quantitative questions (case-insensitive), excluding certain ones
    const quantQuestions = questions.filter(q => 
      q.type && q.type.toLowerCase() === 'quantitative' &&
      !excludedQuestionIds.includes(q.id)
    );
    
    if (quantQuestions.length === 0) {
      // Fallback to old method if no questions config
      for (let issue = 1; issue <= 10; issue++) {
        const issueKey = String(issue);
        const ratings = { '1': 0, '2': 0, '3': 0 };
        
        filteredData.forEach(item => {
          const rating = item[issueKey];
          if (rating && ['1', '2', '3', '1.0', '2.0', '3.0'].includes(rating)) {
            const normalizedRating = Math.floor(parseFloat(rating)).toString();
            if (ratings[normalizedRating] !== undefined) {
              ratings[normalizedRating]++;
            }
          }
        });
        
        heatmapData.push({
          issue: `Issue ${issue}`,
          ratings: ratings,
          total: ratings['1'] + ratings['2'] + ratings['3']
        });
      }
    } else {
      // Use questions config
      quantQuestions.forEach(question => {
        const ratings = { '1': 0, '2': 0, '3': 0 };
        
        filteredData.forEach(item => {
          const rating = item[question.columnHeader];
          if (rating !== null && rating !== undefined && rating !== '') {
            // Convert to string and check if it's 1, 2, or 3
            const ratingStr = String(rating);
            if (['1', '2', '3', '1.0', '2.0', '3.0'].includes(ratingStr)) {
              const normalizedRating = Math.floor(parseFloat(ratingStr)).toString();
              if (ratings[normalizedRating] !== undefined) {
                ratings[normalizedRating]++;
              }
            }
          }
        });
        
        heatmapData.push({
          issue: question.nickname || question.id,
          questionId: question.id,
          ratings: ratings,
          total: ratings['1'] + ratings['2'] + ratings['3']
        });
      });
    }
    
    // Filter out rows with no responses
    return heatmapData.filter(row => row.total > 0);
  };

  const heatmapData = calculateHeatmapData();
  const maxCount = Math.max(...heatmapData.flatMap(d => Object.values(d.ratings)));

  const getHeatmapColor = (count) => {
    if (count === 0) return '#ffffff';
    const intensity = count / maxCount;
    // Gradient from white to dark grey
    const value = Math.floor(255 - (255 - 80) * intensity);
    return `rgb(${value}, ${value}, ${value})`;
  };

  const handleCreatePointer = () => {
    if (onCreatePointer) {
      return onCreatePointer('heatmap');
    }
  };

  return (
    <div className="heatmap-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">Issue Rating Frequency</h3>
          <p className="section-description">Distribution of importance ratings (1-3) across all issues</p>
        </div>
        <button className="snapshot-button" onClick={handleCreatePointer} title="Create pointer to this view">
          🔗 Create Pointer
        </button>
      </div>
      
      <div className="heatmap">
        <div className="heatmap-grid">
          {/* Header row */}
          <div className="heatmap-cell header-cell"></div>
          <div className="heatmap-cell header-cell">Rating: 1</div>
          <div className="heatmap-cell header-cell">Rating: 2</div>
          <div className="heatmap-cell header-cell">Rating: 3</div>
          <div className="heatmap-cell header-cell">Total</div>
          
          {/* Data rows */}
          {heatmapData.map((row, index) => {
            return (
            <React.Fragment key={index}>
              <div className="heatmap-cell row-header">
                <span className={`tag-issue issue-${row.questionId ? row.questionId.replace(' ', '-') : index + 1}`}>
                  {row.issue}
                </span>
              </div>
              {['1', '2', '3'].map(rating => (
                <div 
                  key={rating}
                  className="heatmap-cell data-cell"
                  style={{ 
                    backgroundColor: getHeatmapColor(row.ratings[rating], index + 1),
                    color: row.ratings[rating] > maxCount * 0.5 ? 'white' : '#2a2a2a'
                  }}
                  title={`${row.issue} - Rating ${rating}: ${row.ratings[rating]} responses`}
                >
                  {row.ratings[rating]}
                </div>
              ))}
              <div className="heatmap-cell total-cell">{row.total}</div>
            </React.Fragment>
          );
          })}
        </div>

        <div className="heatmap-legend">
          <span className="legend-label">Frequency:</span>
          <div className="legend-gradient">
            <span>Low</span>
            <div className="gradient-bar"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Heatmap;

