# TransiGenius Cleanup Guide

This guide lists all files and directories that can be safely removed from the TransiGenius project to maintain a clean structure with only the essential backend and frontend components.

## Files and Directories to Remove

### Directories

- **transport-dashboard/** - Obsolete frontend directory as it has been replaced by the new frontend/ directory
- **venv/** - Virtual environment directory (can be recreated as needed)

### Documentation Files

Most of the Markdown files in the root directory are planning/documentation files that can be removed or archived:

- **backend.md** - Backend planning documentation
- **dashboard_pages_requirements.md** - Dashboard requirements documentation
- **frontend_requirements.md** - Frontend requirements documentation
- **immediate_plan.md** - Project plan documentation
- **implementation_analysis.md** - Implementation analysis documentation
- **overview.md** - Project overview documentation
- **project_overview.md** - Project overview documentation
- **transigenius_implementation_plan.md** - Implementation plan documentation

### Configuration Files

- **alembic.ini** - Database migration configuration (if not using Alembic for migrations anymore)

## Files to Keep

### Essential Directories
- **backend/** - The main backend application directory
- **frontend/** - The main frontend application directory
- **Public-Transport-Analysis/** - Contains essential GeoJSON data files needed by the application

### Documentation
- **README.md** - Main project documentation (should be kept and updated)

## Cleanup Process

1. Before deletion, ensure you have backed up any important information from files you plan to remove
2. Confirm that all necessary code has been migrated from transport-dashboard/ to frontend/
3. Verify that the backend/ and frontend/ directories contain all required functionality
4. Remove files and directories in this order:
   - First remove the documentation files
   - Then remove configuration files
   - Finally, remove directories

## Post-Cleanup Steps

After removing the unnecessary files, you should:

1. Update the main README.md with current project structure and setup instructions
2. Ensure both backend and frontend have their own README.md files with specific instructions
3. Test that the application still functions correctly after cleanup
