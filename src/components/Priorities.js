import React from 'react';

function Priorities({ filteredData, onCreatePointer }) {
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
      .map(([priority, count]) => ({ priority, count }))
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
              
              return (
                <div key={index} className="priority-bar-container">
                  <div className="priority-label" title={item.priority}>
                    {item.priority}
                  </div>
                  <div className="priority-bar-wrapper">
                    <div 
                      className="priority-bar"
                      style={{ width: `${barWidth}%` }}
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

