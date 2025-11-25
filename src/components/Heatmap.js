import React, { useState, useEffect } from 'react';
import { getQuestionColor } from '../utils/colorUtils';

function Heatmap({ filteredData, onCreatePointer, questions, selectedEconomic, selectedRespondent, commentsRecords, activePointer }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  
  // Restore sort state from pointer
  useEffect(() => {
    if (activePointer && activePointer.type === 'heatmap') {
      if (activePointer.sortColumn) {
        setSortColumn(activePointer.sortColumn);
      }
      if (activePointer.sortDirection) {
        setSortDirection(activePointer.sortDirection);
      }
    }
  }, [activePointer]);
  
  // Calculate heatmap data using questions config
  const calculateHeatmapData = () => {
    const heatmapData = [];
    
    // Filter data by respondent if selected
    let dataToProcess = filteredData;
    if (selectedRespondent && selectedRespondent !== 'All' && commentsRecords) {
      // Find the comment record(s) that match this respondent
      const matchingCommentIds = Object.keys(commentsRecords).filter(uniqueId => {
        const comment = commentsRecords[uniqueId];
        const preferredName = comment.preferredName || '';
        const mitEmail = comment.mitEmail || '';
        const identifier = preferredName && mitEmail 
          ? `${preferredName} | ${mitEmail}`
          : preferredName || mitEmail;
        return identifier === selectedRespondent;
      });
      
      // Get the individual IDs from matching comments
      const matchingIndividualIds = matchingCommentIds
        .map(uniqueId => commentsRecords[uniqueId].individual)
        .filter(Boolean);
      
      // Filter survey responses by individual ID
      dataToProcess = filteredData.filter(item => 
        matchingIndividualIds.includes(item.ID)
      );
    }
    
    // Questions to exclude from heatmap (by ID, nickname, or column header)
    const excludedQuestionIds = ['open1', 'open2'];
    const excludedNicknames = ['Salary increase range', 'Top Three Priorities'];
    const excludedColumnHeaders = ['Salary increase range', 'Top Three Priorities'];
    
    // Questions to include even if not quantitative (by nickname or column header)
    const forceIncludeNicknames = ['Agency Shop Concept Comfort'];
    const forceIncludeColumnHeaders = ['Agency Shop Concept Comfort'];
    
    // Get quantitative questions (case-insensitive), excluding certain ones
    // Filter by economic type if selected
    const quantQuestions = questions.filter(q => {
      // Check if force-included
      const isForceIncluded = forceIncludeNicknames.includes(q.nickname) || 
                              forceIncludeColumnHeaders.includes(q.columnHeader);
      
      // Check if excluded
      const isExcluded = excludedQuestionIds.includes(q.id) ||
                         excludedNicknames.includes(q.nickname) ||
                         excludedColumnHeaders.includes(q.columnHeader);
      
      if (isExcluded) return false;
      if (isForceIncluded) return (selectedEconomic === 'All' || q.economic === selectedEconomic);
      
      // Otherwise, must be quantitative
      return q.type && q.type.toLowerCase() === 'quantitative' &&
             (selectedEconomic === 'All' || q.economic === selectedEconomic);
    });
    
    if (quantQuestions.length === 0) {
      // Fallback to old method if no questions config
      for (let issue = 1; issue <= 10; issue++) {
        const issueKey = String(issue);
        const ratings = { '1': 0, '2': 0, '3': 0 };
        
        dataToProcess.forEach(item => {
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
        const ratings = { '0': 0, '1': 0, '2': 0, '3': 0 };
        let totalResponses = 0;
        
        dataToProcess.forEach(item => {
          const rating = item[question.columnHeader];
          totalResponses++;
          
          if (rating !== null && rating !== undefined && rating !== '') {
            // Convert to string and check if it's 1, 2, or 3
            const ratingStr = String(rating);
            if (['1', '2', '3', '1.0', '2.0', '3.0'].includes(ratingStr)) {
              const normalizedRating = Math.floor(parseFloat(ratingStr)).toString();
              if (ratings[normalizedRating] !== undefined) {
                ratings[normalizedRating]++;
              }
            } else {
              // Non-answer
              ratings['0']++;
            }
          } else {
            // Non-answer
            ratings['0']++;
          }
        });
        
        const answered = ratings['1'] + ratings['2'] + ratings['3'];
        const total = answered + ratings['0'];
        
        // Calculate average: (3*count3 + 2*count2 + 1*count1) / answered
        const average = answered > 0 
          ? ((3 * ratings['3']) + (2 * ratings['2']) + (1 * ratings['1'])) / answered
          : 0;
        
        // Calculate standard deviation to show distribution/spread
        // Higher std dev = more split across values
        let stdDev = 0;
        if (answered > 0) {
          const variance = (
            (ratings['1'] * Math.pow(1 - average, 2)) +
            (ratings['2'] * Math.pow(2 - average, 2)) +
            (ratings['3'] * Math.pow(3 - average, 2))
          ) / answered;
          stdDev = Math.sqrt(variance);
        }
        
        heatmapData.push({
          issue: question.nickname || question.id,
          questionId: question.id,
          economic: question.economic, // 'Economic' or 'Non-Economic'
          ratings: ratings,
          total: total,
          answered: answered,
          average: average,
          stdDev: stdDev
        });
      });
    }
    
    // Filter out rows with no responses
    return heatmapData.filter(row => row.total > 0);
  };

  let heatmapData = calculateHeatmapData();
  
  // Apply sorting
  if (sortColumn) {
    heatmapData = [...heatmapData].sort((a, b) => {
      let aVal, bVal;
      
      if (sortColumn === 'issue') {
        aVal = a.issue;
        bVal = b.issue;
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (sortColumn === 'average') {
        aVal = a.average;
        bVal = b.average;
      } else if (sortColumn === 'stdDev') {
        aVal = a.stdDev;
        bVal = b.stdDev;
      } else if (sortColumn === 'total') {
        aVal = a.total;
        bVal = b.total;
      } else if (sortColumn === 'answered') {
        aVal = a.answered;
        bVal = b.answered;
      } else {
        // Rating columns: '0', '1', '2', '3'
        aVal = a.ratings[sortColumn] || 0;
        bVal = b.ratings[sortColumn] || 0;
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  
  const maxCount = Math.max(...heatmapData.flatMap(d => Object.values(d.ratings)));
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return '#ffffff';
    const intensity = count / maxCount;
    // Gradient from white to dark grey
    const value = Math.floor(255 - (255 - 80) * intensity);
    return `rgb(${value}, ${value}, ${value})`;
  };

  const handleCreatePointer = () => {
    if (onCreatePointer) {
      // Pass additional heatmap-specific state
      return onCreatePointer('heatmap', null, {
        sortColumn,
        sortDirection,
        selectedEconomic
      });
    }
  };

  const handleDownload = () => {
    const targetElement = document.querySelector('.heatmap');
    if (!targetElement) {
      alert('Could not find heatmap to download');
      return;
    }
    
    // Get computed styles and dimensions
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
    
    // Clone and add styles
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
    
    // Generate filename
    const filterParts = [];
    if (selectedEconomic && selectedEconomic !== 'All') {
      filterParts.push(selectedEconomic.replace(/\s+/g, '-'));
    }
    
    // Add sort information if a sort is applied
    if (sortColumn) {
      const sortColumnName = sortColumn === 'issue' ? 'Issue' :
                             sortColumn === '0' ? 'Zero' :
                             sortColumn === 'average' ? 'Average' :
                             sortColumn === 'stdDev' ? 'Spread' :
                             sortColumn === 'total' ? 'Total' :
                             `Rating-${sortColumn}`;
      const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';
      filterParts.push(`sorted-by-${sortColumnName}-${sortDir}`);
    }
    
    const filterString = filterParts.length > 0 ? '_' + filterParts.join('_') : '';
    const filename = `heatmap${filterString}_${new Date().toISOString().split('T')[0]}.svg`;
    
    // Download
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
    <div className="heatmap-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">Issue Rating Frequency</h3>
          <p className="section-description">Distribution of importance ratings (1-3) across all issues</p>
        </div>
        <div className="section-header-buttons">
          <button className="snapshot-button" onClick={handleCreatePointer} title="Create pointer to this view">
            🔗 Create Pointer
          </button>
          <button className="snapshot-button" onClick={handleDownload} title="Download as SVG">
            ⬇️ Download
          </button>
        </div>
      </div>
      
      <div className="heatmap">
        <div className="heatmap-grid">
          {/* Header row */}
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('issue')}>
            Issue {sortColumn === 'issue' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('0')}>
            Zero {sortColumn === '0' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('1')}>
            Rating: 1 {sortColumn === '1' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('2')}>
            Rating: 2 {sortColumn === '2' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('3')}>
            Rating: 3 {sortColumn === '3' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('average')}>
            Average {sortColumn === 'average' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('stdDev')}>
            Spread {sortColumn === 'stdDev' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          <div className="heatmap-cell header-cell sortable" onClick={() => handleSort('total')}>
            Total {sortColumn === 'total' && (sortDirection === 'asc' ? '▲' : '▼')}
          </div>
          
          {/* Data rows */}
          {heatmapData.map((row, index) => {
            // Get color for this question
            const labelColor = getQuestionColor(row.questionId, row.economic);
            
            return (
            <React.Fragment key={index}>
              <div className="heatmap-cell row-header">
                <span 
                  className="tag-issue"
                  style={{ backgroundColor: labelColor }}
                >
                  {row.issue}
                </span>
              </div>
              {/* Zero column */}
              <div 
                className="heatmap-cell data-cell"
                style={{ 
                  backgroundColor: getHeatmapColor(row.ratings['0'], index + 1),
                  color: row.ratings['0'] > maxCount * 0.5 ? 'white' : '#2a2a2a'
                }}
                title={`${row.issue} - Non-answers: ${row.ratings['0']}`}
              >
                {row.ratings['0']}
              </div>
              {/* Rating columns */}
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
              {/* Average column */}
              <div className="heatmap-cell average-cell" title={`Average: ${row.average.toFixed(2)}`}>
                {row.average.toFixed(2)}
              </div>
              {/* Spread column (standard deviation) */}
              <div className="heatmap-cell spread-cell" title={`Spread (std dev): ${row.stdDev.toFixed(2)} - Higher = more split across values`}>
                {row.stdDev.toFixed(2)}
              </div>
              {/* Total column */}
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

