import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { documentService } from "../services/documentService.js";
import { formatDate } from "../utils/format";
import {
  Folder,
  FolderOpen,
  File,
  Upload,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  Home,
  X,
  FileText,
  Image,
  FileSpreadsheet,
  Download,
  ExternalLink,
} from "lucide-react";

const FILE_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  jpg: Image,
  jpeg: Image,
  png: Image,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FolderTreeItem = ({ folder, activeFolderId, onSelect, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (expanded && !loaded) {
      documentService.getFolders(folder.id).then((res) => {
        setChildren(res.data.folders || []);
        setLoaded(true);
      });
    }
  }, [expanded, loaded, folder.id]);

  const hasChildren = folder.children ? folder.children.length > 0 : children.length > 0;
  const isActive = activeFolderId === folder.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(folder.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition text-left"
        style={{
          backgroundColor: isActive ? "var(--color-primary-muted)" : "transparent",
          color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
        }}
      >
        <span className="w-4 flex-shrink-0">
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </span>
        {expanded || isActive ? <FolderOpen size={16} className="flex-shrink-0" /> : <Folder size={16} className="flex-shrink-0" />}
        <span className="truncate ml-1">{folder.name}</span>
      </button>
      {expanded && (folder.children || children).length > 0 && (
        <div className="ml-3">
          {(folder.children || children).map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              activeFolderId={activeFolderId}
              onSelect={handleFolderClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = () => {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: "My Documents" }]);
  const [folderTree, setFolderTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef(null);

  const loadData = useCallback(async (folderId) => {
    setLoading(true);
    try {
      const [folderRes, docRes, treeRes] = await Promise.all([
        documentService.getFolders(folderId),
        documentService.getDocuments(folderId),
        documentService.getFolderTree(),
      ]);
      setFolders(folderRes.data.folders || []);
      setDocuments(docRes.data.documents || []);
      setFolderTree(treeRes.data.tree || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  const buildBreadcrumbs = useCallback(async (folderId) => {
    if (!folderId) {
      setBreadcrumbs([{ id: null, name: "My Documents" }]);
      return;
    }
    const crumbs = [{ id: null, name: "My Documents" }];
    const allFolders = await documentService.getFolders();
    const folderMap = {};
    (allFolders.data.folders || []).forEach((f) => {
      folderMap[f.id] = f;
    });
    let current = folderMap[folderId];
    const path = [];
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = current.parent_id ? folderMap[current.parent_id] : null;
    }
    setBreadcrumbs([...crumbs, ...path]);
  }, []);

  useEffect(() => {
    loadData(currentFolderId);
    buildBreadcrumbs(currentFolderId);
  }, [currentFolderId, loadData, buildBreadcrumbs]);

  const handleFolderClick = (folderId) => {
    setCurrentFolderId(folderId);
  };

  const handleBreadcrumbClick = (index) => {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await documentService.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName("");
      setShowNewFolder(false);
      loadData(currentFolderId);
    } catch (err) {
      console.error("Failed to create folder:", err);
      toast.error("Failed to create folder");
    }
  };

  const handleRenameFolder = async (id) => {
    if (!renameValue.trim()) return;
    try {
      await documentService.renameFolder(id, renameValue.trim());
      setRenaming(null);
      setRenameValue("");
      loadData(currentFolderId);
    } catch (err) {
      console.error("Failed to rename folder:", err);
      toast.error("Failed to rename folder");
    }
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm("Delete this folder? Documents inside must be moved or deleted first.")) return;
    try {
      await documentService.deleteFolder(id);
      loadData(currentFolderId);
    } catch (err) {
      console.error("Failed to delete folder:", err);
      toast.error(err.response?.data?.error || "Failed to delete folder");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      if (currentFolderId) fd.append("folder_id", currentFolderId);
      await documentService.uploadDocument(fd);
      loadData(currentFolderId);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm("Delete this document? This action cannot be undone.")) return;
    try {
      await documentService.deleteDocument(id);
      loadData(currentFolderId);
    } catch (err) {
      console.error("Failed to delete document:", err);
      toast.error("Failed to delete document");
    }
  };

  const getFileIcon = (name) => {
    const ext = name?.split(".").pop()?.toLowerCase();
    const Icon = FILE_ICONS[ext] || File;
    return <Icon size={20} />;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--color-primary)" }} />
        </div>
      );
    }

    if (folders.length === 0 && documents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Folder size={48} style={{ color: "var(--color-text-muted)" }} />
          <p className="mt-4 text-lg font-medium" style={{ color: "var(--color-text-muted)" }}>This folder is empty</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Upload files or create a new folder to get started
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition group"
            style={{ backgroundColor: "var(--color-bg-hover)" }}
          >
            <button
              onClick={() => handleFolderClick(folder.id)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <FolderOpen size={20} style={{ color: "var(--color-primary)" }} />
              {renaming === folder.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameFolder(folder.id);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onBlur={() => handleRenameFolder(folder.id)}
                  className="px-2 py-0.5 rounded border text-sm flex-1 min-w-0"
                  style={{
                    backgroundColor: "var(--color-bg-primary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="font-medium text-sm truncate">{folder.name}</span>
              )}
            </button>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatDate(folder.created_at, true)}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => {
                  setRenaming(folder.id);
                  setRenameValue(folder.name);
                }}
                className="p-1.5 rounded-lg transition"
                style={{ color: "var(--color-text-muted)" }}
                title="Rename"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                className="p-1.5 rounded-lg transition"
                style={{ color: "var(--color-error)" }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {documents.map((doc) => (
          <div
            key={doc._id}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition group"
            style={{ backgroundColor: "var(--color-bg-hover)" }}
          >
            <div style={{ color: "var(--color-text-muted)" }}>
              {getFileIcon(doc.name)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{doc.name}</span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {doc.type} &middot; {formatDate(doc.createdAt, true)}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg transition"
                style={{ color: "var(--color-text-muted)" }}
                title="Open"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => handleDeleteDocument(doc._id)}
                className="p-1.5 rounded-lg transition"
                style={{ color: "var(--color-error)" }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4">
      {/* Folder Tree Sidebar */}
      <div
        className="w-64 flex-shrink-0 rounded-xl border p-3 overflow-y-auto hidden md:block"
        style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Folders</h3>
          <button
            onClick={() => setShowNewFolder(true)}
            className="p-1 rounded-lg transition"
            style={{ color: "var(--color-primary)" }}
            title="New Folder"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={() => handleFolderClick(null)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition mb-1"
          style={{
            backgroundColor: currentFolderId === null ? "var(--color-primary-muted)" : "transparent",
            color: currentFolderId === null ? "var(--color-primary)" : "var(--color-text-secondary)",
          }}
        >
          <Home size={16} />
          <span>My Documents</span>
        </button>

        {folderTree.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            activeFolderId={currentFolderId}
            onSelect={handleFolderClick}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div
          className="flex items-center gap-2 mb-4 p-3 rounded-xl border flex-wrap"
          style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
        >
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm flex-1 min-w-0 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} style={{ color: "var(--color-text-muted)" }} />}
                <button
                  onClick={() => handleBreadcrumbClick(i)}
                  className="px-2 py-0.5 rounded transition text-sm"
                  style={{
                    color: i === breadcrumbs.length - 1 ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                  }}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg-primary)" }}
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Plus size={16} />
              New Folder
            </button>
          </div>
        </div>

        {/* New Folder Inline Form */}
        {showNewFolder && (
          <div
            className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "var(--color-bg-hover)" }}
          >
            <FolderOpen size={20} style={{ color: "var(--color-primary)" }} />
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
              placeholder="Folder name..."
              className="flex-1 px-2 py-1 rounded border text-sm"
              style={{
                backgroundColor: "var(--color-bg-primary)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1 rounded-lg text-sm font-medium transition"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg-primary)" }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
              className="p-1.5 rounded-lg transition"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto rounded-xl border p-3"
          style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
