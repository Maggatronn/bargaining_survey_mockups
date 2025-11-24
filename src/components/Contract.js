import React, { useState, useEffect } from 'react';

function Contract({ onCreatePointer, targetPage }) {
  const [pageNumber, setPageNumber] = useState('');
  const [currentPage, setCurrentPage] = useState(targetPage || 1);

  useEffect(() => {
    if (targetPage) {
      setCurrentPage(targetPage);
    }
  }, [targetPage]);

  const handleCreatePointer = () => {
    const page = pageNumber ? parseInt(pageNumber) : currentPage;
    if (onCreatePointer) {
      onCreatePointer('contract', page);
    }
  };

  return (
    <div className="contract-container">
      <div className="section-header">
        <div className="section-header-text">
          <h3 className="section-title">GSU-MIT Contract (2023-2026)</h3>
          <p className="section-description">Collective Bargaining Agreement</p>
        </div>
        <div className="contract-controls">
          <input
            type="number"
            min="1"
            placeholder="Page #"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            className="page-input"
            title="Enter page number for pointer"
          />
          <button className="snapshot-button" onClick={handleCreatePointer} title="Create pointer to this page">
            🔗 Create Pointer
          </button>
        </div>
      </div>
      
      <div className="contract-viewer">
        <embed
          key={currentPage}
          src={`${process.env.PUBLIC_URL}/FINAL+2023-2026+GSU+and+MIT+CBA+Signed.pdf#page=${currentPage}`}
          type="application/pdf"
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}

export default Contract;

