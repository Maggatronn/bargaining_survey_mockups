import React, { useState, useEffect, useCallback } from 'react';
import Airtable from 'airtable';
import './App.css';
import SearchAndFilters from './components/SearchAndFilters';
import InsightsPanel from './components/InsightsPanel';
import DataExplorerPanel from './components/DataExplorerPanel';
import PasswordProtection from './components/PasswordProtection';
import SensemakerSelection from './components/SensemakerSelection';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sensemakerSelected, setSensemakerSelected] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEconomic, setSelectedEconomic] = useState('All'); // 'All', 'Economic', 'Non-Economic'
  const [selectedRespondent, setSelectedRespondent] = useState('All');
  const [annotations, setAnnotations] = useState({});
  const [tagRecordIds, setTagRecordIds] = useState({}); // Map of tag key → record ID
  const [tagOptions, setTagOptions] = useState([]); // Array of {id, title, emoji, key}
  const [commentsRecords, setCommentsRecords] = useState({});
  const [departments, setDepartments] = useState([]);
  const [departmentMap, setDepartmentMap] = useState({});
  const [insights, setInsights] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('heatmap'); // Track active tab for pointers
  const [selectedInsightFilter, setSelectedInsightFilter] = useState('All'); // Track insight filter for pointers
  const [contractPage, setContractPage] = useState(1); // Track current contract page
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [sensemakers, setSensemakers] = useState([]);
  const [currentSensemaker, setCurrentSensemaker] = useState(null);

  // Check if already authenticated in this session
  useEffect(() => {
    const authenticated = sessionStorage.getItem('authenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
    }
    const sensemakerChosen = sessionStorage.getItem('sensemakerSelected');
    if (sensemakerChosen === 'true') {
      setSensemakerSelected(true);
    }
  }, []);

  useEffect(() => {
    // Configure Airtable
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const surveyResponsesTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_SurveyResponses;
    const commentsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Comments;
    const tagsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Tags;
    const departmentsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Departments;

    if (!apiKey || !baseId || !surveyResponsesTable || !commentsTable || !tagsTable) {
      console.error('Missing Airtable configuration');
      setLoading(false);
      return;
    }

    const base = new Airtable({ apiKey }).base(baseId);

    // Fetch Departments table
    const fetchDepartments = () => {
      return new Promise((resolve, reject) => {
        const depts = [];
        const deptMap = {};
        
        if (!departmentsTable) {
          resolve({ depts, deptMap });
          return;
        }
        
        base(departmentsTable)
          .select()
          .eachPage(
            function page(records, fetchNextPage) {
              records.forEach(record => {
                const deptName = record.fields.Name || record.fields.Department || 'Unknown';
                depts.push({
                  id: record.id,
                  name: deptName
                });
                deptMap[record.id] = deptName;
              });
              fetchNextPage();
            },
            function done(err) {
              if (err) reject(err);
              else resolve({ depts, deptMap });
            }
          );
      });
    };

    // Fetch Sensemakers table
    const fetchSensemakers = () => {
      return new Promise((resolve, reject) => {
        const sensemakersTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Sensemakers;
        
        if (!sensemakersTable) {
          resolve([]);
          return;
        }
        
        const sensemakersList = [];
        base(sensemakersTable)
          .select()
          .eachPage(
            function page(records, fetchNextPage) {
              records.forEach(record => {
                sensemakersList.push({
                  id: record.id,
                  name: record.fields['Preferred Name'] || record.fields['Full Name'] || 'Unknown'
                });
              });
              fetchNextPage();
            },
            function done(err) {
              if (err) reject(err);
              else resolve(sensemakersList);
            }
          );
      });
    };

    // Fetch Tags table to get all tag options with Title and Emoji
    const fetchTags = () => {
      return new Promise((resolve, reject) => {
        const tagIdMap = {}; // Map of tag key → record ID
        const options = []; // Array of tag options
        base(tagsTable)
          .select()
          .eachPage(
            function page(records, fetchNextPage) {
              records.forEach(record => {
                const title = record.fields.Title || record.fields.Name || record.fields.name || record.fields.Tag || '';
                const emoji = record.fields.Emoji || '';
                
                // Create a key from the title (lowercase, no spaces)
                const key = title.toLowerCase().replace(/\s+/g, '_');
                
                if (title) {
                  tagIdMap[key] = record.id;
                  options.push({
                    id: record.id,
                    title: title,
                    emoji: emoji,
                    key: key
                  });
                  
                  // Also keep backwards compatibility with old tag names
                  if (title === 'Plus' || title.includes('Maintain')) tagIdMap.plus = record.id;
                  if (title === 'Delta' || title.includes('Improve')) tagIdMap.delta = record.id;
                  if (title === 'Star' || title.includes('Testimonial')) tagIdMap.star = record.id;
                  if (title === 'Verified' || title.includes('Verified')) tagIdMap.verified = record.id;
                }
              });
              fetchNextPage();
            },
            function done(err) {
              if (err) reject(err);
              else resolve({ tagIdMap, options });
            }
          );
      });
    };

    // Fetch Comments table
    const fetchComments = () => {
      return new Promise((resolve, reject) => {
        const comments = {};
        base(commentsTable)
          .select()
          .eachPage(
            function page(records, fetchNextPage) {
              records.forEach(record => {
                // Use ID field as the unique identifier
                const uniqueId = record.fields['ID'];
                  const responseText = record.fields['Response Text'];
                  const question = record.fields['Question'];
                const questionName = record.fields['Question Name'];
                
                if (uniqueId && responseText) {
                  comments[uniqueId] = {
                    recordId: record.id,
                    tags: record.fields.Tags || [],
                    fullText: responseText,
                    question: question,
                    questionName: questionName,
                    department: record.fields['Department'],
                    preferredName: record.fields['Preferred Name'] || '',
                    mitEmail: record.fields['MIT Email'] || ''
                  };
                }
              });
              fetchNextPage();
            },
            function done(err) {
              if (err) reject(err);
              else {
                resolve(comments);
              }
            }
          );
      });
    };

    // Fetch Survey Responses table
    const fetchSurveyResponses = () => {
      return new Promise((resolve, reject) => {
        const records = [];
        base(surveyResponsesTable)
          .select({
            view: 'Grid view'
          })
          .eachPage(
            function page(pageRecords, fetchNextPage) {
              pageRecords.forEach(record => {
                records.push(record.fields);
              });
              fetchNextPage();
            },
            function done(err) {
              if (err) reject(err);
              else resolve(records);
            }
          );
      });
    };

    // Fetch all data
    Promise.all([fetchTags(), fetchComments(), fetchSurveyResponses(), fetchDepartments(), fetchSensemakers()])
      .then(([{ tagIdMap, options }, comments, surveyResponses, { depts, deptMap }, sensemakersList]) => {
        setTagRecordIds(tagIdMap);
        setTagOptions(options);
        setCommentsRecords(comments);
        setData(surveyResponses);
        setFilteredData(surveyResponses);
        setDepartments(depts);
        setDepartmentMap(deptMap);
        setSensemakers(sensemakersList);
        
        // Restore sensemaker from session storage if available
        if (sensemakersList.length > 0) {
          const savedSensemaker = sessionStorage.getItem('currentSensemaker');
          if (savedSensemaker) {
            const sensemaker = sensemakersList.find(s => s.id === savedSensemaker);
            if (sensemaker) {
              setCurrentSensemaker(sensemaker);
            }
          }
          // Otherwise leave as null (None selected)
        }
        
        // Initialize annotations from existing tags (now supports multiple tags)
        // Create reverse map from record ID to tag key
        const reverseTagMap = {};
        Object.entries(tagIdMap).forEach(([key, id]) => {
          reverseTagMap[id] = key;
        });
        
        const initialAnnotations = {};
        Object.entries(comments).forEach(([uniqueId, comment]) => {
          if (comment.tags && comment.tags.length > 0) {
            const tagKeys = [];
            comment.tags.forEach(tagId => {
              const key = reverseTagMap[tagId];
              if (key) {
                tagKeys.push(key);
              }
            });
            if (tagKeys.length > 0) {
              initialAnnotations[uniqueId] = tagKeys;
            }
          }
        });
        setAnnotations(initialAnnotations);
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = data;

    if (selectedDepartment !== 'All') {
      // Filter by department name or ID
      filtered = filtered.filter(item => {
        // Try both "Department (from Notes)" and "Department" fields
        const department = item['Department (from Notes)'] || item['Department'];
        
        if (!department) return false;
        
        // Check if Department is an array of IDs (linked records)
        if (Array.isArray(department)) {
          return department.some(deptId => {
            const deptName = departmentMap[deptId];
            return deptName === selectedDepartment;
          });
        }
        
        // Check if Department is a single ID
        const deptName = departmentMap[department];
        if (deptName) {
          return deptName === selectedDepartment;
        }
        
        // Fallback to direct string comparison
        return department === selectedDepartment;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(item => {
        // Search across all fields in the item
        const searchableValues = Object.values(item).filter(value => 
          typeof value === 'string' || typeof value === 'number'
        );
        
        return searchableValues.some(value => 
          value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredData(filtered);
  }, [selectedDepartment, searchTerm, data, departmentMap]);

  // Get department names for the filter dropdown
  const departmentFilterOptions = ['All', ...departments.map(d => d.name)];

  // Handle panel resizing
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 15 && newWidth < 85) {
      setLeftPanelWidth(newWidth);
    }
  }, []);

  // Create a pointer to the current view state
  const [pendingPointer, setPendingPointer] = useState(null);
  const [activePointer, setActivePointer] = useState(null); // Track the pointer being navigated to
  
  const handleCreatePointer = useCallback((type, pageNumber, componentState) => {
    const pointer = {
      type, // 'heatmap', 'comments', 'priorities', 'stipend', or 'contract'
      tab: activeTab,
      department: selectedDepartment,
      searchTerm: searchTerm,
      insightFilter: selectedInsightFilter,
      timestamp: new Date().toLocaleString(),
      pointerData: {
        type,
        tab: activeTab,
        department: selectedDepartment,
        searchTerm,
        insightFilter: selectedInsightFilter,
        pageNumber: pageNumber, // For contract pointers
        ...componentState // Spread component-specific state (sort, filters, etc.)
      }
    };
    setPendingPointer(pointer);
    alert('Pointer created! Now edit an insight to add this view.');
  }, [activeTab, selectedDepartment, searchTerm, selectedInsightFilter]);

  // Navigate to a view based on a pointer
  const handleNavigateToPointer = useCallback((pointer) => {
    if (!pointer) return;
    
    // Set the active pointer so components can restore their state
    setActivePointer(pointer);
    
    // Set the tab
    setActiveTab(pointer.tab || pointer.type);
    
    // Apply global filters
    if (pointer.department) {
      setSelectedDepartment(pointer.department);
    }
    if (pointer.searchTerm) {
      setSearchTerm(pointer.searchTerm);
    }
    if (pointer.insightFilter) {
      setSelectedInsightFilter(pointer.insightFilter);
    }
    if (pointer.selectedEconomic) {
      setSelectedEconomic(pointer.selectedEconomic);
    }
    
    // For contract pointers, jump to the page
    if (pointer.type === 'contract' && pointer.pageNumber) {
      setContractPage(pointer.pageNumber);
    }
    
    // Clear the active pointer after a short delay (components will have consumed it)
    setTimeout(() => setActivePointer(null), 100);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Fetch questions configuration from Airtable
  useEffect(() => {
    const fetchQuestions = async () => {
      const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
      const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
      const questionsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Questions;

      if (!apiKey || !baseId || !questionsTable) {
        console.error('Missing Airtable configuration for Questions');
        return;
      }

      try {
        const base = new Airtable({ apiKey }).base(baseId);
        const records = [];

        await base(questionsTable)
          .select({ view: 'Grid view' })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach(record => {
              const typeField = record.fields.Type;
              const type = typeField && typeField.name ? typeField.name : typeField;
              
              const economicField = record.fields['(Non)Economic'];
              const economic = economicField && economicField.name ? economicField.name : economicField;
              
              records.push({
                id: record.fields.ID,
                columnHeader: record.fields['Column Header'],
                nickname: record.fields.Nickname,
                type: type,
                economic: economic // 'Economic' or 'Non-Economic'
              });
            });
            fetchNextPage();
          });

        setQuestions(records);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();
  }, []);

  // Fetch insights from Airtable
  useEffect(() => {
    const fetchInsights = async () => {
      const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
      const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
      const insightTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Insight;

      if (!apiKey || !baseId || !insightTable) {
        return;
      }

      try {
        const base = new Airtable({ apiKey }).base(baseId);
        const records = [];

        await base(insightTable)
          .select({ view: 'Grid view' })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach(record => {
              records.push({
                id: record.id,
                name: record.fields.Name,
                title: record.fields.Title || '',
                notes: record.fields.Notes,
                departments: record.fields.Departments || [],
                comments: record.fields.Comments || []
              });
            });
            fetchNextPage();
          });

        setInsights(records);
      } catch (error) {
        console.error('Error fetching insights:', error);
      }
    };

    fetchInsights();
  }, []);

  // Handle annotation change (multi-select tags)
  const handleAnnotationChange = async (uniqueId, value) => {
    // Value is always an array of tag keys for multi-select
    const newTags = Array.isArray(value) ? value : [value].filter(v => v !== '');
    
    setAnnotations(prev => ({
      ...prev,
      [uniqueId]: newTags.length > 0 ? newTags : undefined
    }));

    await updateAirtableTags(uniqueId, newTags);
  };

  // Handle tag toggle (for any individual tag)
  const handleTagToggle = async (uniqueId, tagKey) => {
    const currentTags = annotations[uniqueId] || [];
    const currentArray = Array.isArray(currentTags) ? currentTags : [currentTags];
    
    let newTags;
    if (currentArray.includes(tagKey)) {
      // Remove tag
      newTags = currentArray.filter(t => t !== tagKey);
    } else {
      // Add tag
      newTags = [...currentArray, tagKey];
    }
    
    setAnnotations(prev => ({
      ...prev,
      [uniqueId]: newTags.length > 0 ? newTags : undefined
    }));

    await updateAirtableTags(uniqueId, newTags);
  };
  
  // Legacy star toggle for backwards compatibility
  const handleStarToggle = async (uniqueId) => {
    await handleTagToggle(uniqueId, 'star');
  };

  // Update Airtable tags
  const updateAirtableTags = async (uniqueId, newTags) => {
    const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;
    const baseId = process.env.REACT_APP_AIRTABLE_BASE_ID;
    const commentsTable = process.env.REACT_APP_AIRTABLE_TABLE_NAME_Comments;

    if (!apiKey || !baseId || !commentsTable) {
      console.error('Missing Airtable configuration');
      return;
    }

    const commentRecord = commentsRecords[uniqueId];
    if (!commentRecord) {
      console.error('Comment record not found for:', uniqueId);
      console.error('Available IDs (first 5):', Object.keys(commentsRecords).slice(0, 5));
      console.error('Looking for format: Name DateTime | question');
      return;
    }

    const base = new Airtable({ apiKey }).base(baseId);
    
    try {
      const tagsToSet = [];
      newTags.forEach(tagKey => {
        // Look up the record ID for this tag key
        const recordId = tagRecordIds[tagKey];
        if (recordId) {
          tagsToSet.push(recordId);
        }
      });

      await base(commentsTable).update(commentRecord.recordId, {
        'Tags': tagsToSet
      });
    } catch (err) {
      console.error('Error updating annotation:', err);
      // Revert local state on error
      setAnnotations(prev => {
        const newAnnotations = { ...prev };
        newAnnotations[uniqueId] = annotations[uniqueId];
        return newAnnotations;
      });
    }
  };

  // Show password protection if not authenticated
  if (!isAuthenticated) {
    return <PasswordProtection onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  // Show sensemaker selection after authentication but before main interface
  if (!sensemakerSelected && !loading && sensemakers.length > 0) {
    return (
      <SensemakerSelection 
        sensemakers={sensemakers} 
        onSensemakerSelected={(sensemaker) => {
          setCurrentSensemaker(sensemaker);
          setSensemakerSelected(true);
        }} 
      />
    );
  }

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  // Generate unique respondent list from comments
  const respondentOptions = ['All'];
  const uniqueRespondents = new Set();
  Object.values(commentsRecords).forEach(comment => {
    const preferredName = comment.preferredName || '';
    const mitEmail = comment.mitEmail || '';
    if (preferredName || mitEmail) {
      const identifier = preferredName && mitEmail 
        ? `${preferredName} | ${mitEmail}`
        : preferredName || mitEmail;
      uniqueRespondents.add(identifier);
    }
  });
  respondentOptions.push(...Array.from(uniqueRespondents).sort());

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
        <h1>GSU Organizers Data Explorer</h1>
        <p className="subtitle">Explore and analyze organizer data</p>
          </div>
            </div>
      </header>

      <SearchAndFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        departments={departmentFilterOptions}
        selectedEconomic={selectedEconomic}
        setSelectedEconomic={setSelectedEconomic}
        selectedRespondent={selectedRespondent}
        setSelectedRespondent={setSelectedRespondent}
        respondents={respondentOptions}
        sensemakers={sensemakers}
        currentSensemaker={currentSensemaker}
        setCurrentSensemaker={setCurrentSensemaker}
      />

      <div className="panels-container">
        <div className="left-panel" style={{ width: `${leftPanelWidth}%` }}>
          <InsightsPanel 
            data={data} 
            commentsRecords={commentsRecords} 
            annotations={annotations}
            questions={questions}
            onNavigateToPointer={handleNavigateToPointer}
            pendingPointer={pendingPointer}
            onPointerUsed={() => setPendingPointer(null)}
          />
          </div>

        <div 
          className="panel-divider" 
          onMouseDown={handleMouseDown}
        >
          <div className="divider-handle"></div>
                </div>
                
        <div className="right-panel" style={{ width: `${100 - leftPanelWidth}%` }}>
          <DataExplorerPanel 
            filteredData={filteredData}
            annotations={annotations}
            handleAnnotationChange={handleAnnotationChange}
            handleStarToggle={handleStarToggle}
            handleTagToggle={handleTagToggle}
            tagOptions={tagOptions}
            departmentMap={departmentMap}
            insights={insights}
            commentsRecords={commentsRecords}
            onCreatePointer={handleCreatePointer}
            questions={questions}
            selectedDepartment={selectedDepartment}
            searchTerm={searchTerm}
            selectedEconomic={selectedEconomic}
            selectedRespondent={selectedRespondent}
            currentSensemaker={currentSensemaker}
            sensemakers={sensemakers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedInsightFilter={selectedInsightFilter}
            setSelectedInsightFilter={setSelectedInsightFilter}
            contractPage={contractPage}
            activePointer={activePointer}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

