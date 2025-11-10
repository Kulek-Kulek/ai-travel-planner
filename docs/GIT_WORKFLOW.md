# Git Workflow Guide

## Branch Strategy

We follow a feature branch workflow with code review before merging to main.

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/authentication`, `feature/itinerary-save`)
- `fix/` - Bug fixes (e.g., `fix/form-validation`)
- `refactor/` - Code refactoring (e.g., `refactor/api-structure`)
- `docs/` - Documentation updates (e.g., `docs/setup-guide`)

### Workflow Steps

#### 1. Create a New Feature Branch

```bash
# Make sure you're on the main branch and it's up to date
git checkout master
git pull origin main

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name
```

#### 2. Work on Your Feature

Make your changes, commit frequently with clear messages:

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: Add user authentication with Supabase

- Implement sign up/sign in/sign out
- Add protected routes
- Create auth middleware
"
```

#### 3. Push Your Feature Branch

```bash
# Push your branch to GitHub
git push origin feature/your-feature-name
```

#### 4. Create a Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Add a clear title and description
4. Request a code review
5. Wait for approval

#### 5. Merge After Review

Once approved:

```bash
# Switch back to master
git checkout master

# Pull the latest changes
git pull origin main

# Merge your feature branch
git merge feature/your-feature-name

# Push to main
git push origin master:main

# Delete the feature branch (optional)
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### Commit Message Format

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `style:` - Formatting, missing semicolons, etc.
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example:
```
feat: Add itinerary saving functionality

- Create save button in itinerary card
- Add server action to save to database
- Show success toast on save
```

### Current Branch

You are currently on: **`feature/authentication`**

This branch is for implementing the authentication system with Supabase.

### Quick Reference

```bash
# Check current branch
git branch

# Switch branch
git checkout branch-name

# Create new branch and switch
git checkout -b feature/new-feature

# View all branches
git branch -a

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# See changes
git status

# View commit history
git log --oneline -10
```

