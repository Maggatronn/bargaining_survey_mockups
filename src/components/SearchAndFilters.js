import React from 'react';

function SearchAndFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedDepartment, 
  setSelectedDepartment,
  departments,
  selectedEconomic,
  setSelectedEconomic,
  selectedRespondent,
  setSelectedRespondent,
  respondents,
  sensemakers,
  currentSensemaker,
  setCurrentSensemaker
}) {
  return (
    <div className="controls">
      <div className="filters-inline">
        <div className="filter-group">
          <label>Department:</label>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept || 'Unknown'}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select value={selectedEconomic} onChange={(e) => setSelectedEconomic(e.target.value)}>
            <option value="All">All</option>
            <option value="Economic">Economic</option>
            <option value="Non-Economic">Non-Economic</option>
          </select>
        </div>

        <div className="search-box-inline">
          <input
            type="text"
            placeholder="Search responses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {sensemakers && sensemakers.length > 0 && (
          <div className="filter-group">
            <label>Sensemaker:</label>
            <select 
              value={currentSensemaker?.id || ''}
              onChange={(e) => {
                const selected = sensemakers.find(s => s.id === e.target.value);
                setCurrentSensemaker(selected);
                sessionStorage.setItem('currentSensemaker', e.target.value);
              }}
            >
              {sensemakers.map(sm => (
                <option key={sm.id} value={sm.id}>{sm.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group filter-group-compact">
          <label>Respondent:</label>
          <select 
            value={selectedRespondent} 
            onChange={(e) => setSelectedRespondent(e.target.value)}
            className="respondent-select"
          >
            {respondents.map(resp => (
              <option key={resp} value={resp}>{resp}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default SearchAndFilters;

