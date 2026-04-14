/**
 * 项目列表组件
 */
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/authService';
import { getLanguage, t } from '../i18n';
import { LayoutGrid, List, Plus, Search, SlidersHorizontal, Upload, X, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectListProps {
  onSelectProject?: (project: Project) => void;
  onCreateProject?: () => void;
  onClose?: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ 
  onSelectProject, 
  onCreateProject, 
  onClose 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res: any = await apiRequest('/user/projects?page=1&limit=50');
      const rows = res?.data?.projects || [];
      setProjects(rows);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    
    try {
      await apiRequest('/user/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newProjectTitle, description: newProjectDesc })
      });
      setShowCreateModal(false);
      setNewProjectTitle('');
      setNewProjectDesc('');
      loadProjects();
      onCreateProject?.();
    } catch (error) {
      alert('Failed to create project');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    if (!confirm(t('deleteConfirmProject'))) return;
    
    try {
      await apiRequest(`/user/projects/${projectId}`, { method: 'DELETE' });
      loadProjects();
    } catch (error) {
      alert('Failed to delete project');
    }
  };

  const openEditProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditProjectTitle(project.name || '');
    setEditProjectDesc(project.description || '');
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    if (!editProjectTitle.trim()) return;

    try {
      await apiRequest(`/user/projects/${editingProject.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editProjectTitle.trim(),
          description: editProjectDesc
        })
      });
      setEditingProject(null);
      setEditProjectTitle('');
      setEditProjectDesc('');
      loadProjects();
    } catch (error) {
      alert('Failed to update project');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return `${p.name || ''} ${p.description || ''}`.toLowerCase().includes(q);
  });

  const relativeTime = (iso?: string) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    const lang = getLanguage();
    const diff = Date.now() - dt.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return lang === 'en' ? `${minutes} ${t('minutesAgo')}` : `${minutes}${t('minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return lang === 'en' ? `${hours} ${t('hoursAgo')}` : `${hours}${t('hoursAgo')}`;
    const days = Math.floor(hours / 24);
    return lang === 'en' ? `${days} ${t('daysAgo')}` : `${days}${t('daysAgo')}`;
  };

  const projectCoverStyle = (id: number) => {
    const colors = [
      ['#0ea5e9', '#a855f7'],
      ['#22c55e', '#06b6d4'],
      ['#f97316', '#ef4444'],
      ['#6366f1', '#06b6d4'],
      ['#eab308', '#f97316'],
      ['#14b8a6', '#8b5cf6']
    ];
    const pair = colors[id % colors.length];
    return { backgroundImage: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})` } as React.CSSProperties;
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-8 rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#111] to-[#0b0b0b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <div>
            <div className="text-2xl font-semibold text-white">{t('projectsTitle')}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchProjectsPlaceholder')}
                className="w-[260px] pl-9 pr-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center gap-2"
              >
                <SlidersHorizontal size={16} className="text-neutral-400" />
                <span className="text-sm">{t('showAll')}</span>
              </button>
              {showFilter && (
                <div className="absolute right-0 mt-2 w-[180px] rounded-xl border border-neutral-800 bg-[#0f0f0f] shadow-2xl overflow-hidden">
                  <button
                    onClick={() => setShowFilter(false)}
                    className="w-full text-left px-4 py-3 text-sm text-neutral-200 hover:bg-white/5"
                  >
                    {t('showAll')}
                  </button>
                </div>
              )}
            </div>

            <div className="inline-flex rounded-lg border border-neutral-800 bg-black/30 p-1">
              <button
                onClick={() => setViewMode('grid')}
                title={t('gridView')}
                className={`w-9 h-9 rounded-md flex items-center justify-center ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title={t('listView')}
                className={`w-9 h-9 rounded-md flex items-center justify-center ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                <List size={16} />
              </button>
            </div>

            <button
              className="w-10 h-10 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center justify-center"
              title={t('import')}
            >
              <Upload size={18} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 flex items-center gap-2 font-medium"
            >
              <Plus size={16} />
              <span className="text-sm">{t('newProject')}</span>
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center justify-center"
              title={t('cancel')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5' : 'space-y-3'}>
              <button
                onClick={() => setShowCreateModal(true)}
                className={`group rounded-2xl border border-neutral-800 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden ${viewMode === 'grid' ? 'aspect-[4/3]' : ''}`}
              >
                <div className={viewMode === 'grid' ? 'h-full w-full flex flex-col items-center justify-center gap-3' : 'flex items-center gap-4 px-5 py-4'}>
                  <span className="w-12 h-12 rounded-full bg-white/10 border border-neutral-800 flex items-center justify-center text-white group-hover:bg-white/15">
                    <Plus size={20} />
                  </span>
                  <span className="text-sm font-medium text-white">{t('newProject')}</span>
                </div>
              </button>

              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject?.(project)}
                  className={`group rounded-2xl border border-neutral-800 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer overflow-hidden ${viewMode === 'grid' ? '' : 'flex items-center justify-between px-5 py-4'}`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="h-[120px] w-full" style={projectCoverStyle(project.id)}>
                        <div className="h-full w-full bg-black/25 flex items-center justify-center">
                          <div className="text-white/90 font-semibold text-xl tracking-wide">{(project.name || 'P').slice(0, 1).toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{project.name}</div>
                            <div className="mt-1 text-xs text-neutral-500 truncate">
                              {project.updated_at ? `${t('updatedAtPrefix')} ${relativeTime(project.updated_at)}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={(e) => openEditProject(e, project)}
                            className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-lg border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-neutral-200"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-neutral-800" style={projectCoverStyle(project.id)}>
                          <div className="h-full w-full bg-black/25 flex items-center justify-center">
                            <div className="text-white/90 font-semibold">{(project.name || 'P').slice(0, 1).toUpperCase()}</div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{project.name}</div>
                          <div className="mt-1 text-xs text-neutral-500 truncate">
                            {project.updated_at ? `${t('updatedAtPrefix')} ${relativeTime(project.updated_at)}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditProject(e, project)}
                          className="w-9 h-9 rounded-lg border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-neutral-200"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(e, project.id)}
                          className="w-9 h-9 rounded-lg border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                  {viewMode === 'grid' && (
                    <div className="px-4 pb-4 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditProject(e, project)}
                        className="w-9 h-9 rounded-lg border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-neutral-200"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="w-9 h-9 rounded-lg border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0f0f0f] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                <div className="text-white font-semibold">{t('createNewProject')}</div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-full border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-neutral-200"
                  title={t('cancel')}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    {t('projectTitleLabel')} *
                  </label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
                    placeholder={t('projectNamePlaceholder')}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    {t('projectDescriptionLabel')}
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500 resize-none"
                    placeholder={t('projectDescriptionPlaceholder')}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectTitle.trim()}
                    className="flex-1 px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {t('createProject')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingProject(null)} />
            <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0f0f0f] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                <div className="text-white font-semibold">{t('editProject')}</div>
                <button
                  onClick={() => setEditingProject(null)}
                  className="w-9 h-9 rounded-full border border-neutral-800 bg-black/30 hover:bg-black/50 flex items-center justify-center text-neutral-200"
                  title={t('cancel')}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    {t('projectTitleLabel')} *
                  </label>
                  <input
                    type="text"
                    value={editProjectTitle}
                    onChange={(e) => setEditProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    {t('projectDescriptionLabel')}
                  </label>
                  <textarea
                    value={editProjectDesc}
                    onChange={(e) => setEditProjectDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500 resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setEditingProject(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleUpdateProject}
                    disabled={!editProjectTitle.trim()}
                    className="flex-1 px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
