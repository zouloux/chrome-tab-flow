#!/bin/bash

###############################################################################
# commit-and-merge.sh
# 
# Smart script to commit changes on current branch/worktree and merge into main.
# - Works from any workspace or branch
# - Safe: validates at every step
# - Asks y/n questions when needed
# - Does not use LLMs
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() { echo -e "${BLUE}ℹ${NC} $*"; }
print_success() { echo -e "${GREEN}✓${NC} $*"; }
print_error() { echo -e "${RED}✗${NC} $*"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $*"; }

ask_yes_no() {
    local prompt="$1"
    local response
    while true; do
        read -p "$(echo -e ${YELLOW}?${NC}) $prompt (y/n): " response
        case "$response" in
            [yY][eE][sS]|[yY]) return 0 ;;
            [nN][oO]|[nN]) return 1 ;;
            *) print_warn "Please answer y or n" ;;
        esac
    done
}

# Error handler
error_exit() {
    print_error "$*"
    exit 1
}

###############################################################################
# STEP 1-2: Check git status
###############################################################################

print_info "Checking git status..."

# Ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error_exit "Not in a git repository"
fi

# Get current status
status_output=$(git status --porcelain 2>&1)

if [ -z "$status_output" ]; then
    print_success "Working tree is clean, nothing to commit"
else
    print_info "Found changes:"
    echo "$status_output"
    
    ###############################################################################
    # STEP 3: Ask user to commit
    ###############################################################################
    
    if ! ask_yes_no "Commit these changes?"; then
        print_warn "Skipping commit"
        exit 0
    fi
    
    print_info "Staging all changes..."
    git add -A
    
    # Prompt for commit message
    print_info "Enter commit message (one line, imperative mood, ≤72 chars, no period):"
    read -p "> " commit_msg
    
    if [ -z "$commit_msg" ]; then
        error_exit "Commit message cannot be empty"
    fi
    
    # Validate message length
    msg_length=${#commit_msg}
    if [ "$msg_length" -gt 72 ]; then
        print_warn "Message is ${msg_length} chars (max 72)"
        if ! ask_yes_no "Proceed anyway?"; then
            print_warn "Aborted"
            git reset HEAD
            exit 0
        fi
    fi
    
    # Commit
    print_info "Creating commit..."
    if git commit -m "$commit_msg"; then
        print_success "Commit created"
    else
        error_exit "Commit failed"
    fi
fi

###############################################################################
# STEP 4: Verify commit
###############################################################################

print_info "Verifying commit..."
last_commit=$(git log -1 --oneline 2>/dev/null)
if [ -n "$last_commit" ]; then
    print_success "Latest commit: $last_commit"
else
    print_warn "Could not retrieve last commit"
fi

###############################################################################
# STEP 5-6: Get current branch and worktree info
###############################################################################

current_branch=$(git branch --show-current)
if [ -z "$current_branch" ]; then
    error_exit "Could not determine current branch (detached HEAD?)"
fi

print_info "Current branch: $current_branch"

# Check if we're in a worktree
worktree_list=$(git worktree list)
main_worktree_path=$(echo "$worktree_list" | head -1 | awk '{print $1}')

if [ "$current_branch" == "main" ] || [ "$current_branch" == "master" ]; then
    print_warn "Already on main/master branch, skipping merge"
    exit 0
fi

###############################################################################
# STEP 7: Merge into main
###############################################################################

print_info "Checking merge target..."

# Validate main exists
if ! git -C "$main_worktree_path" show-ref --verify --quiet refs/heads/main && \
   ! git -C "$main_worktree_path" show-ref --verify --quiet refs/heads/master; then
    error_exit "Neither 'main' nor 'master' branch found in main worktree"
fi

# Determine target branch (prefer main, fallback to master)
target_branch="main"
if ! git -C "$main_worktree_path" show-ref --verify --quiet refs/heads/main; then
    target_branch="master"
fi

print_info "Main worktree: $main_worktree_path"
print_info "Target branch: $target_branch"

# Check for conflicts in main branch before merging
if git -C "$main_worktree_path" merge --no-commit --no-ff "$current_branch" 2>/dev/null; then
    git -C "$main_worktree_path" merge --abort 2>/dev/null
    print_success "Merge will succeed (pre-check passed)"
else
    # Check if it's a conflict issue
    merge_status=$(git -C "$main_worktree_path" merge --no-commit --no-ff "$current_branch" 2>&1 || true)
    git -C "$main_worktree_path" merge --abort 2>/dev/null || true
    
    if echo "$merge_status" | grep -q -i "conflict"; then
        error_exit "Merge would result in conflicts. Resolve conflicts manually first."
    fi
fi

if ! ask_yes_no "Merge '$current_branch' into '$target_branch'?"; then
    print_warn "Merge cancelled"
    exit 0
fi

print_info "Performing merge..."
merge_message="Merge $current_branch into $target_branch"

if git -C "$main_worktree_path" merge --no-ff "$current_branch" -m "$merge_message"; then
    print_success "Merge completed"
else
    error_exit "Merge failed. Check for conflicts and merge manually."
fi

###############################################################################
# STEP 8: Verify merge
###############################################################################

print_info "Verifying merge..."
log_output=$(git -C "$main_worktree_path" log --oneline -3)
print_success "Recent commits in $target_branch:"
echo "$log_output"

###############################################################################
# STEP 9-10: Final notes
###############################################################################

print_success "✨ All done!"
print_info "Notes:"
echo "  • Changes committed on: $current_branch"
echo "  • Merged into: $target_branch (in main worktree)"
echo "  • Branch '$current_branch' still exists locally"

if ask_yes_no "Delete branch '$current_branch'?"; then
    git branch -d "$current_branch" 2>/dev/null && print_success "Branch deleted" || print_warn "Could not delete branch"
fi

if ask_yes_no "Push to remote?"; then
    git -C "$main_worktree_path" push && print_success "Pushed to remote" || print_warn "Push failed"
fi
