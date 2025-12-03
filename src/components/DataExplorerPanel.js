import React from 'react';
import Heatmap from './Heatmap';
import QualitativeResponses from './QualitativeResponses';
import Priorities from './Priorities';
import Stipend from './Stipend';
import Contract from './Contract';

function DataExplorerPanel({ 
  filteredData, 
  annotations, 
  handleAnnotationChange, 
  handleStarToggle,
  handleTagToggle,
  tagOptions,
  departmentMap,
  insights,
  commentsRecords,
  onCreatePointer,
  questions,
  selectedDepartment,
  searchTerm,
  selectedEconomic,
  selectedRespondent,
  currentSensemaker,
  sensemakers,
  activeTab,
  setActiveTab,
  selectedInsightFilter,
  setSelectedInsightFilter,
  contractPage,
  activePointer
}) {

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
          <button 
            className={`tab-button ${activeTab === 'contract' ? 'active' : ''}`}
            onClick={() => setActiveTab('contract')}
          >
            Contract
          </button>
        </div>
      </div>

      <div className="panel-content">
        {activeTab === 'heatmap' && (
          <Heatmap 
            filteredData={filteredData} 
            onCreatePointer={onCreatePointer} 
            questions={questions} 
            selectedEconomic={selectedEconomic} 
            selectedRespondent={selectedRespondent}
            commentsRecords={commentsRecords}
            activePointer={activePointer} 
          />
        )}
        {activeTab === 'comments' && (
          <QualitativeResponses 
            filteredData={filteredData}
            annotations={annotations}
            handleAnnotationChange={handleAnnotationChange}
            handleStarToggle={handleStarToggle}
            handleTagToggle={handleTagToggle}
            tagOptions={tagOptions}
            departmentMap={departmentMap}
            insights={insights}
            commentsRecords={commentsRecords}
            questions={questions}
            selectedDepartment={selectedDepartment}
            searchTerm={searchTerm}
            selectedEconomic={selectedEconomic}
            selectedRespondent={selectedRespondent}
            currentSensemaker={currentSensemaker}
            sensemakers={sensemakers}
            selectedInsightFilter={selectedInsightFilter}
            setSelectedInsightFilter={setSelectedInsightFilter}
            onCreatePointer={onCreatePointer}
            activePointer={activePointer}
          />
        )}
        {activeTab === 'priorities' && (
          <Priorities 
            filteredData={filteredData} 
            onCreatePointer={onCreatePointer}
            selectedRespondent={selectedRespondent}
            commentsRecords={commentsRecords}
            questions={questions}
          />
        )}
        {activeTab === 'stipend' && (
          <Stipend 
            filteredData={filteredData} 
            onCreatePointer={onCreatePointer}
            selectedRespondent={selectedRespondent}
            commentsRecords={commentsRecords}
          />
        )}
        {activeTab === 'contract' && <Contract onCreatePointer={onCreatePointer} targetPage={contractPage} />}
      </div>
    </div>
  );
}

export default DataExplorerPanel;

