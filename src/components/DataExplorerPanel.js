import React, { useState } from 'react';
import Heatmap from './Heatmap';
import QualitativeResponses from './QualitativeResponses';
import Priorities from './Priorities';
import Stipend from './Stipend';

function DataExplorerPanel({ 
  filteredData, 
  annotations, 
  handleAnnotationChange, 
  handleStarToggle,
  departmentMap,
  insights,
  commentsRecords,
  onSnapshot,
  questions,
  selectedDepartment,
  searchTerm
}) {
  const [activeTab, setActiveTab] = useState('heatmap');

  return (
    <div className="data-explorer-panel">
      <div className="panel-header">
        <h2 className="panel-title">Data Explorer</h2>
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            Heatmap
          </button>
          <button 
            className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comments
          </button>
          <button 
            className={`tab-button ${activeTab === 'priorities' ? 'active' : ''}`}
            onClick={() => setActiveTab('priorities')}
          >
            Priorities
          </button>
          <button 
            className={`tab-button ${activeTab === 'stipend' ? 'active' : ''}`}
            onClick={() => setActiveTab('stipend')}
          >
            Stipend
          </button>
        </div>
      </div>

      <div className="panel-content">
        {activeTab === 'heatmap' && <Heatmap filteredData={filteredData} onSnapshot={onSnapshot} questions={questions} />}
        {activeTab === 'comments' && (
          <QualitativeResponses 
            filteredData={filteredData}
            annotations={annotations}
            handleAnnotationChange={handleAnnotationChange}
            handleStarToggle={handleStarToggle}
            departmentMap={departmentMap}
            insights={insights}
            commentsRecords={commentsRecords}
            questions={questions}
            selectedDepartment={selectedDepartment}
            searchTerm={searchTerm}
          />
        )}
        {activeTab === 'priorities' && <Priorities filteredData={filteredData} onSnapshot={onSnapshot} />}
        {activeTab === 'stipend' && <Stipend filteredData={filteredData} onSnapshot={onSnapshot} />}
      </div>
    </div>
  );
}

export default DataExplorerPanel;

