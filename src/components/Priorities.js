import React from 'react';
import { getQuestionColor, isOutlinedStyle } from '../utils/colorUtils';

function Priorities({ filteredData, onCreatePointer, questions = [] }) {
  // Create a mapping from priority name to question info
  const getPriorityToQuestionMap = () => {
    const map = {};
    questions.forEach(q => {
      if (q.priorityMapping) {
        // priorityMapping could be a string or array
        const mappings = Array.isArray(q.priorityMapping) ? q.priorityMapping : [q.priorityMapping];
        mappings.forEach(priorityName => {
          if (priorityName) {
            map[priorityName.toLowerCase().trim()] = {
              questionId: q.id,
              economic: q.economic
            };
          }
        });
      }
    });
    return map;
  };
  
  const priorityToQuestion = getPriorityToQuestionMap();
  
  // Parse and count priorities from multi-select field
  const getPrioritiesData = () => {
    const priorityCounts = {};
    
    // Debug: log first item's fields to help identify correct field name
    if (filteredData.length > 0) {
      console.log('Available fields in survey data:', Object.keys(filteredData[0]));
    }
    
    filteredData.forEach(item => {
      // Try multiple possible field names for priorities
      const priorities = item['Top Three Priorities'] || item['Priorities'] || item['priorities'];
      
      // Check if priorities is an array (multi-select field from Airtable)
      if (Array.isArray(priorities)) {
        priorities.forEach(priority => {
          // Each priority is an object with {id, name, color}
          const priorityName = typeof priority === 'object' ? priority.name : priority;
          
          if (priorityName && priorityName.trim().length > 0) {
            if (priorityCounts[priorityName]) {
              priorityCounts[priorityName]++;
            } else {
              priorityCounts[priorityName] = 1;
            }
          }
        });
      } else if (typeof priorities === 'string' && priorities.trim().length > 0) {
        // Handle single string value
        if (priorityCounts[priorities]) {
          priorityCounts[priorities]++;
        } else {
          priorityCounts[priorities] = 1;
        }
      }
    });
    
    // Convert to array and sort by count (descending)
    const sortedPriorities = Object.entries(priorityCounts)
      .filter(([priority]) => priority && priority.trim().length > 0)
      .map(([priority, count]) => {
        // Look up the question mapping for this priority
        const questionInfo = priorityToQuestion[priority.toLowerCase().trim()];
        return { 
          priority, 
          count,
          questionId: questionInfo?.questionId || null,
          economic: questionInfo?.economic || null
        };
      })
      .sort((a, b) => b.count - a.count);
    
    return sortedPriorities;
  };

  const prioritiesData = getPrioritiesData();
  const maxCount = prioritiesData.length > 0 ? prioritiesData[0].count : 0;

  const handleCreatePointer = () => {
    if (onCreatePointer) {
      return onCreatePointer('priorities');
    }
  };

  const handleDownload = () => {
    const targetElement = document.querySelector('.priorities-histogram');
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
    
    const filename = `priorities_${new Date().toISOString().split('T')[0]}.svg`;
    
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
    <div className="priorities-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">Priorities</h3>
          <p className="section-description">Frequency of priorities mentioned by participants</p>
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
      
      <div className="priorities-content">
        {prioritiesData.length === 0 ? (
          <div className="no-results">
            <p>No priorities data available for the selected filters.</p>
          </div>
        ) : (
          <div className="priorities-histogram">
            {prioritiesData.map((item, index) => {
              const barWidth = (item.count / maxCount) * 100;
              
              // Get color from mapped question, or use default
              const hasMapping = item.questionId && item.economic;
              const barColor = hasMapping 
                ? getQuestionColor(item.questionId, item.economic)
                : '#667eea'; // Default blue-purple
              const isNonEconomic = hasMapping && isOutlinedStyle(item.economic);
              
              // Convert hex to rgba for 50% opacity stripes
              const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };
              
              // Create diagonal stripe pattern for non-economic (alternating 80% and 100% opacity, 5px stripes)
              const stripeBackground = isNonEconomic 
                ? `repeating-linear-gradient(
                    45deg,
                    ${hexToRgba(barColor, 0.8)},
                    ${hexToRgba(barColor, 0.8)} 5px,
                    ${barColor} 5px,
                    ${barColor} 10px
                  )`
                : barColor;
              
              return (
                <div key={index} className="priority-bar-container">
                  <div className="priority-label" title={item.priority}>
                    {item.priority}
                  </div>
                  <div className="priority-bar-wrapper">
                    <div 
                      className={`priority-bar ${isNonEconomic ? 'striped' : ''}`}
                      style={{ 
                        width: `${barWidth}%`,
                        background: stripeBackground,
                        border: isNonEconomic ? `2px solid ${barColor}` : 'none',
                        color: '#ffffff'
                      }}
                    >
                      <span className="priority-count">{item.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Priorities;

