import React, { useRef } from 'react';
import html2canvas from 'html2canvas';

function Stipend({ filteredData, onSnapshot }) {
  const stipendRef = useRef(null);
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

  const handleSnapshot = async () => {
    if (!stipendRef.current) return;
    
    try {
      const canvas = await html2canvas(stipendRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imageData = canvas.toDataURL('image/png');
      const timestamp = new Date().toLocaleString();
      
      if (onSnapshot) {
        onSnapshot({
          type: 'stipend',
          title: 'Housing Cost Stipend Histogram',
          imageData,
          timestamp
        });
      }
    } catch (error) {
      console.error('Error capturing snapshot:', error);
    }
  };

  return (
    <div className="stipend-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">Housing Cost Stipend</h3>
          <p className="section-description">Distribution of housing costs from lowest to highest</p>
        </div>
        <button className="snapshot-button" onClick={handleSnapshot} title="Add snapshot to insight">
          📷 Snapshot
        </button>
      </div>
      
      <div className="stipend-content" ref={stipendRef}>
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

