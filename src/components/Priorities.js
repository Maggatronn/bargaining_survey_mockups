import React from 'react';

function Priorities({ filteredData, onCreatePointer }) {
  // Parse and count priorities from multi-select field
  const getPrioritiesData = () => {
    const priorityCounts = {};

    
    filteredData.forEach(item => {
      const priorities = item['Top Three Priorities'];
      
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

  return (
    <div className="priorities-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">Priorities</h3>
          <p className="section-description">Frequency of priorities mentioned by participants</p>
        </div>
        <button className="snapshot-button" onClick={handleCreatePointer} title="Create pointer to this view">
          🔗 Create Pointer
        </button>
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

