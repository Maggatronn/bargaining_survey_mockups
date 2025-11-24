import React, { useState, useEffect, useCallback } from 'react';
import Airtable from 'airtable';
import './App.css';
import SearchAndFilters from './components/SearchAndFilters';
import InsightsPanel from './components/InsightsPanel';
import DataExplorerPanel from './components/DataExplorerPanel';
import PasswordProtection from './components/PasswordProtection';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [annotations, setAnnotations] = useState({});
  const [tagRecordIds, setTagRecordIds] = useState({ plus: null, delta: null, star: null });
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
                  name: record.fields['Full Name']|| 'Unknown'
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

    // Fetch Tags table to get Plus and Delta record IDs
    const fetchTags = () => {
      return new Promise((resolve, reject) => {
        const tags = {};
        base(tagsTable)
          .select()
          .eachPage(
            function page(records, fetchNextPage) {
              records.forEach(record => {
                const name = record.fields.Name || record.fields.name || record.fields.Tag;
                if (name === 'Plus') tags.plus = record.id;
                if (name === 'Delta') tags.delta = record.id;
                if (name === 'Star') tags.star = record.id;
              });
              fetchNextPage();
            },
            function done(err) {
              if (err) reject(err);
              else resolve(tags);
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
                    department: record.fields['Department']
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
      .then(([tags, comments, surveyResponses, { depts, deptMap }, sensemakersList]) => {
        setTagRecordIds(tags);
        setCommentsRecords(comments);
        setData(surveyResponses);
        setFilteredData(surveyResponses);
        setDepartments(depts);
        setDepartmentMap(deptMap);
        setSensemakers(sensemakersList);
        
        // Set first sensemaker as default if available
        if (sensemakersList.length > 0) {
          const savedSensemaker = sessionStorage.getItem('currentSensemaker');
          if (savedSensemaker) {
            const sensemaker = sensemakersList.find(s => s.id === savedSensemaker);
            if (sensemaker) {
              setCurrentSensemaker(sensemaker);
            } else {
              setCurrentSensemaker(sensemakersList[0]);
            }
          } else {
            setCurrentSensemaker(sensemakersList[0]);
          }
        }
        
        // Initialize annotations from existing tags (now supports multiple tags)
        const initialAnnotations = {};
        Object.entries(comments).forEach(([uniqueId, comment]) => {
          if (comment.tags && comment.tags.length > 0) {
            const tagSet = new Set();
            comment.tags.forEach(tagId => {
              if (tagId === tags.plus) tagSet.add('plus');
              if (tagId === tags.delta) tagSet.add('delta');
              if (tagId === tags.star) tagSet.add('star');
            });
            if (tagSet.size > 0) {
              initialAnnotations[uniqueId] = Array.from(tagSet);
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
  
  const handleCreatePointer = useCallback((type, pageNumber) => {
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
        pageNumber: pageNumber // For contract pointers
      }
    };
    setPendingPointer(pointer);
    alert('Pointer created! Now edit an insight to add this view.');
  }, [activeTab, selectedDepartment, searchTerm, selectedInsightFilter]);

  // Navigate to a view based on a pointer
  const handleNavigateToPointer = useCallback((pointer) => {
    if (!pointer) return;
    
    // Set the tab
    setActiveTab(pointer.tab || pointer.type);
    
    // Apply filters
    if (pointer.department) {
      setSelectedDepartment(pointer.department);
    }
    if (pointer.searchTerm) {
      setSearchTerm(pointer.searchTerm);
    }
    if (pointer.insightFilter) {
      setSelectedInsightFilter(pointer.insightFilter);
    }
    
    // For contract pointers, jump to the page
    if (pointer.type === 'contract' && pointer.pageNumber) {
      setContractPage(pointer.pageNumber);
    }
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
              
              records.push({
                id: record.fields.ID,
                columnHeader: record.fields['Column Header'],
                nickname: record.fields.Nickname,
                type: type
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

  // Handle annotation change (dropdown)
  const handleAnnotationChange = async (uniqueId, value) => {
    const currentTags = annotations[uniqueId] || [];
    const currentArray = Array.isArray(currentTags) ? currentTags : [currentTags];
    
    // Update local state immediately
    let newTags;
    if (value === '') {
      // Remove plus/delta but keep star
      newTags = currentArray.filter(t => t === 'star');
    } else {
      // Replace plus/delta but keep star
      newTags = currentArray.filter(t => t === 'star');
      newTags.push(value);
    }
    
    setAnnotations(prev => ({
      ...prev,
      [uniqueId]: newTags.length > 0 ? newTags : undefined
    }));

    await updateAirtableTags(uniqueId, newTags);
  };

  // Handle star toggle
  const handleStarToggle = async (uniqueId) => {
    const currentTags = annotations[uniqueId] || [];
    const currentArray = Array.isArray(currentTags) ? currentTags : [currentTags];
    
    let newTags;
    if (currentArray.includes('star')) {
      // Remove star
      newTags = currentArray.filter(t => t !== 'star');
    } else {
      // Add star
      newTags = [...currentArray, 'star'];
    }
    
    setAnnotations(prev => ({
      ...prev,
      [uniqueId]: newTags.length > 0 ? newTags : undefined
    }));

    await updateAirtableTags(uniqueId, newTags);
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
      newTags.forEach(tag => {
        if (tag === 'plus' && tagRecordIds.plus) tagsToSet.push(tagRecordIds.plus);
        if (tag === 'delta' && tagRecordIds.delta) tagsToSet.push(tagRecordIds.delta);
        if (tag === 'star' && tagRecordIds.star) tagsToSet.push(tagRecordIds.star);
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

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

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
            departmentMap={departmentMap}
            insights={insights}
            commentsRecords={commentsRecords}
            onCreatePointer={handleCreatePointer}
            questions={questions}
            selectedDepartment={selectedDepartment}
            searchTerm={searchTerm}
            currentSensemaker={currentSensemaker}
            sensemakers={sensemakers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedInsightFilter={selectedInsightFilter}
            setSelectedInsightFilter={setSelectedInsightFilter}
            contractPage={contractPage}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

