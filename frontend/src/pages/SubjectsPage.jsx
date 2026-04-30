import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContextValue';
import { Book, ChevronDown, ChevronUp, Plus, FileText, ExternalLink, Video, Link as LinkIcon, Trash2, Edit } from 'lucide-react';

const SubjectsPage = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState({ show: false, subject: null });
  const [showTopicModal, setShowTopicModal] = useState({ show: false, subjectId: null });
  const [showResourceModal, setShowResourceModal] = useState({ show: false, topicId: null });
  const [showEditResourceModal, setShowEditResourceModal] = useState({ show: false, resource: null, subjectId: null, topicId: null });

  // Form states
  const [newSubject, setNewSubject] = useState({ name: '', description: '' });
  const [editSubject, setEditSubject] = useState({ name: '', description: '' });
  const [newTopic, setNewTopic] = useState({ name: '', description: '' });
  const [newResource, setNewResource] = useState({ title: '', file: null });
  const [editResource, setEditResource] = useState({ title: '' });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/subjects');
        setSubjects(response.data);
      } catch (error) {
        console.error("Error fetching subjects", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (user?.role !== 'teacher') return;
    try {
      const res = await axios.post('http://localhost:5000/api/subjects', newSubject);
      const newSubjectData = { ...res.data, topics: [] };
      setSubjects([...subjects, newSubjectData]);
      
      // Also create a game for this subject
      try {
        await axios.post('http://localhost:5000/api/games', {
          title: newSubject.name,
          type: 'quiz',
          subject_id: res.data.id
        });
      } catch (gameError) {
        console.error("Error creating game for subject", gameError);
      }
      
      setShowSubjectModal(false);
      setNewSubject({ name: '', description: '' });
    } catch (error) {
      console.error("Error adding subject", error);
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    if (user?.role !== 'teacher') return;
    try {
      const res = await axios.put(`http://localhost:5000/api/subjects/${showEditSubjectModal.subject.id}`, editSubject);
      setSubjects(subjects.map(s => s.id === showEditSubjectModal.subject.id ? { ...s, ...res.data } : s));
      setShowEditSubjectModal({ show: false, subject: null });
      setEditSubject({ name: '', description: '' });
    } catch (error) {
      console.error("Error editing subject", error);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (user?.role !== 'teacher') return;
    if (!window.confirm('Are you sure you want to delete this subject? This will also delete all topics and resources.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/subjects/${subjectId}`);
      setSubjects(subjects.filter(s => s.id !== subjectId));
    } catch (error) {
      console.error("Error deleting subject", error);
    }
  };

  const handleDeleteTopic = async (subjectId, topicId) => {
    if (user?.role !== 'teacher') return;
    if (!window.confirm('Are you sure you want to delete this topic and all its resources?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/subjects/${subjectId}/topics/${topicId}`);
      setSubjects(subjects.map(s => {
        if (s.id === subjectId) {
          return { ...s, topics: s.topics.filter(t => t.id !== topicId) };
        }
        return s;
      }));
    } catch (error) {
      console.error("Error deleting topic", error);
    }
  };

  const handleDeleteResource = async (resourceId, subjectId, topicId) => {
    if (user?.role !== 'teacher') return;
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/subjects/resources/${resourceId}`);
      setSubjects(subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            topics: s.topics.map(t => {
              if (t.id === topicId) {
                return { ...t, resources: t.resources.filter(r => r.id !== resourceId) };
              }
              return t;
            })
          };
        }
        return s;
      }));
      alert('Resource deleted successfully!');
    } catch (error) {
      console.error("Error deleting resource", error);
      alert(`Failed to delete resource: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEditResource = async (e) => {
    e.preventDefault();
    if (user?.role !== 'teacher') return;
    try {
      const res = await axios.put(`http://localhost:5000/api/subjects/resources/${showEditResourceModal.resource.id}`, { title: editResource.title });
      
      setSubjects(subjects.map(s => {
        if (s.id === showEditResourceModal.subjectId) {
          return {
            ...s,
            topics: s.topics.map(t => {
              if (t.id === showEditResourceModal.topicId) {
                return { ...t, resources: t.resources.map(r => r.id === showEditResourceModal.resource.id ? { ...r, ...res.data } : r) };
              }
              return t;
            })
          };
        }
        return s;
      }));
      
      setShowEditResourceModal({ show: false, resource: null, subjectId: null, topicId: null });
      setEditResource({ title: '' });
    } catch (error) {
      console.error("Error editing resource", error);
      alert(`Failed to edit resource: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (user?.role !== 'teacher') return;
    try {
      const res = await axios.post(`http://localhost:5000/api/subjects/${showTopicModal.subjectId}/topics`, newTopic);
      setSubjects(subjects.map(s => {
        if (s.id === showTopicModal.subjectId) {
          return { ...s, topics: [...s.topics, { ...res.data, resources: [] }] };
        }
        return s;
      }));
      setShowTopicModal({ show: false, subjectId: null });
      setNewTopic({ name: '', description: '' });
    } catch (error) {
      console.error("Error adding topic", error);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (user?.role !== 'teacher') return;
    
    const formData = new FormData();
    formData.append('title', newResource.title);
    if (newResource.file) formData.append('file', newResource.file);

    try {
      const res = await axios.post(`http://localhost:5000/api/subjects/topics/${showResourceModal.topicId}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSubjects(subjects.map(s => ({
        ...s,
        topics: s.topics.map(t => {
          if (t.id === showResourceModal.topicId) {
            return { ...t, resources: [...t.resources, res.data] };
          }
          return t;
        })
      })));
      
      setShowResourceModal({ show: false, topicId: null });
      setNewResource({ title: '', file: null });
    } catch (error) {
      console.error("Error adding resource", error);
    }
  };

  const handleOpenResource = async (resource) => {
    window.open(resource.url, '_blank');
    if (user) {
      try {
        await axios.post('http://localhost:5000/api/subjects/resources/progress', {
          resource_id: resource.id,
          time_spent_seconds: 60 
        });
      } catch (e) {
         console.error(e);
      }
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500 fade-in">Loading Subjects...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 outline outline-1 outline-gray-200 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 mt-1">Browse your learning materials by subject and topic.</p>
        </div>
        
        {user?.role === 'teacher' && (
          <button 
            onClick={() => setShowSubjectModal(true)}
            className="flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 hover-lift transition-all"
          >
            <Plus size={18} className="mr-2" />
            Add Subject
          </button>
        )}
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in">
            {/* Subject Header */}
            <div 
              className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
                  <Book size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{subject.name}</h2>
                  {subject.description && <p className="text-sm text-gray-500">{subject.description}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {user?.role === 'teacher' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowTopicModal({ show: true, subjectId: subject.id }); }}
                      className="flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-700 text-sm font-medium rounded-lg hover:bg-brand-100 transition-all hover:scale-105 active:scale-95"
                      title="Add Topic"
                    >
                      <Plus size={16} />
                      <span>Add Topic</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowEditSubjectModal({ show: true, subject }); setEditSubject({ name: subject.name, description: subject.description }); }}
                      className="p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                      title="Edit Subject"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                <div className="text-gray-400">
                  {expandedSubject === subject.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>
            </div>

            {/* Topics List */}
            {expandedSubject === subject.id && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4">
                {subject.topics.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No topics added yet.</p>
                ) : (
                  subject.topics.map(topic => (
                    <div key={topic.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors border-b border-transparent"
                        onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{topic.name}</h3>
                        </div>
                        <div className="flex items-center space-x-4">
                           {user?.role === 'teacher' && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowResourceModal({ show: true, topicId: topic.id }); }}
                                className="flex items-center px-3 py-1.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-lg hover:bg-brand-100 transition-colors"
                              >
                                <Plus size={16} className="mr-1" /> Add Resource
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTopic(subject.id, topic.id); }}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Topic"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                          <div className="text-gray-400">
                            {expandedTopic === topic.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {/* Topic Content & Resources */}
                      {expandedTopic === topic.id && (
                        <div className="p-4 border-t border-gray-100 bg-white">
                          {topic.description && (
                            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                              {topic.description}
                            </div>
                          )}
                          
                          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Learning Resources</h4>
                          
                          {topic.resources && topic.resources.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {topic.resources.map((resource) => (
                                <div key={resource.id} className="flex flex-col p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all group">
                                  <div className="flex items-start space-x-3 mb-2">
                                    <div className="mt-1 text-brand-500">
                                      {resource.type === 'pdf' ? <FileText size={20} /> : resource.type === 'video' ? <Video size={20} /> : <LinkIcon size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate" title={resource.title}>{resource.title}</p>
                                      <p className="text-xs text-gray-500 capitalize">{resource.type}</p>
                                    </div>
                                  </div>
                                  <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center gap-2">
                                     <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleOpenResource(resource); }}
                                      className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center"
                                     >
                                       Open <ExternalLink size={12} className="ml-1" />
                                     </button>
                                     {user?.role === 'teacher' && (
                                       <div className="flex gap-1">
                                         <button 
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setShowEditResourceModal({ show: true, resource, subjectId: subject.id, topicId: topic.id }); setEditResource({ title: resource.title }); }}
                                          className="text-xs font-medium text-gray-600 hover:text-brand-600 flex items-center p-1 hover:bg-brand-50 rounded transition-colors"
                                          title="Edit Resource"
                                         >
                                           <Edit size={14} />
                                         </button>
                                         <button 
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteResource(resource.id, subject.id, topic.id); }}
                                          className="text-xs font-medium text-red-600 hover:text-red-800 flex items-center p-1 hover:bg-red-50 rounded transition-colors"
                                          title="Delete Resource"
                                         >
                                           <Trash2 size={14} />
                                         </button>
                                       </div>
                                     )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No resources available for this topic yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
        {subjects.length === 0 && !loading && (
           <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
             <Book size={48} className="mx-auto text-gray-300 mb-4" />
             <h3 className="text-lg font-medium text-gray-900">No Subjects Found</h3>
             <p className="text-gray-500 mt-1">Teachers can add subjects to get started.</p>
           </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showSubjectModal && user?.role === 'teacher' && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Subject</h2>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                <input required type="text" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="E.g., Computer Science" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea value={newSubject.description} onChange={e => setNewSubject({...newSubject, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="Brief description of the subject..." rows="3" />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal.show && user?.role === 'teacher' && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Subject</h2>
            <form onSubmit={handleEditSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                <input required type="text" value={editSubject.name} onChange={e => setEditSubject({...editSubject, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="E.g., Computer Science" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea value={editSubject.description} onChange={e => setEditSubject({...editSubject, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="Brief description of the subject..." rows="3" />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowEditSubjectModal({ show: false, subject: null })} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showTopicModal.show && user?.role === 'teacher' && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Topic</h2>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Topic Name</label>
                <input required type="text" value={newTopic.name} onChange={e => setNewTopic({...newTopic, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="E.g., Data Structures" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea value={newTopic.description} onChange={e => setNewTopic({...newTopic, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="What will be covered in this topic?" rows="3" />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowTopicModal({show: false, subjectId: null})} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showResourceModal.show && user?.role === 'teacher' && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Learning Resource (PDF)</h2>
            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource Title</label>
                <input required type="text" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="E.g., Linked Lists Handout" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PDF File</label>
                <input required type="file" accept="application/pdf" onChange={e => setNewResource({...newResource, file: e.target.files[0]})} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 outline-none" />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowResourceModal({show: false, topicId: null})} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Resource Modal */}
      {showEditResourceModal.show && user?.role === 'teacher' && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Learning Resource</h2>
            <form onSubmit={handleEditResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource Title</label>
                <input required type="text" value={editResource.title} onChange={e => setEditResource({...editResource, title: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500" placeholder="E.g., Linked Lists Handout" />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowEditResourceModal({show: false, resource: null, subjectId: null, topicId: null})} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;
