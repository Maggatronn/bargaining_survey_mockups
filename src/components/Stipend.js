import React from 'react';

function Stipend({ filteredData, onCreatePointer }) {
  // Parse and count housing costs
  const getStipendData = () => {
    const costCounts = {};
    
    filteredData.forEach(item => {
      if (item['Salary increase range'] && item['Salary increase range'].toString().trim()) {
        const cost = item['Salary increase range'].toString().trim();
        
        if (costCounts[cost]) {
          costCounts[cost]++;
        } else {
          costCounts[cost] = 1;
        }
      }
    });
    
    // Convert to array and sort by cost (ascending - lowest to highest)
    const sortedCosts = Object.entries(costCounts)
      .map(([cost, count]) => {
        // Try to parse as number for sorting, but keep original string for display
        const numericCost = parseFloat(cost.replace(/[^0-9.-]/g, ''));
        return { 
          cost, 
          count,
          numericCost: isNaN(numericCost) ? 0 : numericCost
        };
      })
      .sort((a, b) => a.numericCost - b.numericCost);
    
    return sortedCosts;
  };

  const stipendData = getStipendData();
  const maxCount = stipendData.length > 0 ? Math.max(...stipendData.map(d => d.count)) : 0;

  const handleCreatePointer = () => {
    if (onCreatePointer) {
      return onCreatePointer('stipend');
    }
  };

  const handleDownload = () => {
    const targetElement = document.querySelector('.stipend-histogram');
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
    
    const filename = `stipend_${new Date().toISOString().split('T')[0]}.svg`;
    
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
    <div className="stipend-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">Stipend Increase</h3>
          <p className="section-description">Distribution of stipend increases from lowest to highest</p>
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
      
      <div className="stipend-content">
        {stipendData.length === 0 ? (
          <div className="no-results">
            <p>No housing cost data available for the selected filters.</p>
          </div>
        ) : (
          <div className="stipend-histogram">
            {stipendData.map((item, index) => {
              const barWidth = (item.count / maxCount) * 100;
              
              return (
                <div key={index} className="stipend-bar-container">
                  <div className="stipend-label" title={item.cost}>
                    {item.cost}
                  </div>
                  <div className="stipend-bar-wrapper">
                    <div 
                      className="stipend-bar"
                      style={{ width: `${barWidth}%` }}
                    >
                      <span className="stipend-count">{item.count}</span>
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

export default Stipend;

