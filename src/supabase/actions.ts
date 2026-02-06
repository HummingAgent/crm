'use server';

import { createAdminClient } from './server';
import type { Project, Task, Comment, User } from './types';

// ============ USERS ============

export async function getUsers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_users')
    .select('id, name, email, avatar_url')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data as User[];
}

// ============ PROJECTS ============

export async function getProjects() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Project;
}

export async function createProject(project: { 
  name: string; 
  description?: string;
  github_owner?: string;
  github_repo?: string;
  project_type?: 'client' | 'internal';
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_projects')
    .insert({
      name: project.name,
      description: project.description || null,
      github_owner: project.github_owner || null,
      github_repo: project.github_repo || null,
      project_type: project.project_type || 'client',
      status: 'active',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  try {
    console.log('updateProject called with id:', id, 'updates:', JSON.stringify(updates));
    const supabase = createAdminClient();
    
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    console.log('Clean updates:', JSON.stringify(cleanUpdates));
    
    const { data, error } = await supabase
      .from('pd_projects')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('updateProject Supabase error:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }
    
    console.log('updateProject success:', data?.id);
    return data as Project;
  } catch (err) {
    console.error('updateProject exception:', err);
    throw err;
  }
}

export async function deleteProject(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pd_projects')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ TASKS ============

export async function getTasks(projectId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_tasks')
    .select('*, pd_task_attachments(count)')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  // Transform to include attachment_count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksWithCount = data?.map((task: any) => ({
    ...task,
    attachment_count: task.pd_task_attachments?.[0]?.count || 0,
    pd_task_attachments: undefined // Remove the nested object
  }));
  
  return tasksWithCount as Task[];
}

export async function getTask(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Task;
}

export async function createTask(task: {
  project_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  type?: string;
  phase?: string;
  assigned_to?: string;
  deadline?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_tasks')
    .insert({
      project_id: task.project_id,
      title: task.title,
      description: task.description || null,
      status: task.status || 'not-started',
      priority: task.priority || null,
      type: task.type || 'task',
      phase: task.phase || null,
      assigned_to: task.assigned_to || null,
      deadline: task.deadline || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>) {
  console.log('🔄 [SERVER] updateTask called:', id, JSON.stringify(updates));
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ [SERVER] updateTask error:', error);
    throw error;
  }
  console.log('✅ [SERVER] updateTask success:', id, 'sort_order now:', data?.sort_order);
  return data as Task;
}

export async function deleteTask(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pd_tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ COMMENTS ============

export async function getComments(taskId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as Comment[];
}

export async function createComment(comment: {
  task_id: string;
  user_name: string;
  content: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_comments')
    .insert(comment)
    .select()
    .single();
  
  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pd_comments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ TASK ASSIGNEES ============

export async function getTaskAssignees(taskId: string) {
  const supabase = createAdminClient();
  
  // Get assignee records
  const { data: assigneeRecords, error } = await supabase
    .from('pd_task_assignees')
    .select('id, task_id, user_id, assigned_at')
    .eq('task_id', taskId);
  
  if (error) throw error;
  if (!assigneeRecords || assigneeRecords.length === 0) return [];
  
  // Get user details
  const userIds = assigneeRecords.map(a => a.user_id);
  const { data: users, error: usersError } = await supabase
    .from('pd_users')
    .select('*')
    .in('id', userIds);
  
  if (usersError) throw usersError;
  
  return users || [];
}

export async function getTasksWithAssignees(projectId: string) {
  const supabase = createAdminClient();
  
  // Get tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('pd_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (tasksError) throw tasksError;
  if (!tasks || tasks.length === 0) return [];
  
  // Get all assignees for these tasks
  const taskIds = tasks.map(t => t.id);
  const { data: assigneeRecords, error: assigneesError } = await supabase
    .from('pd_task_assignees')
    .select('id, task_id, user_id')
    .in('task_id', taskIds);
  
  if (assigneesError) throw assigneesError;
  
  // Get attachment counts for all tasks (do this before potential early returns)
  const { data: attachmentCounts } = await supabase
    .from('pd_task_attachments')
    .select('task_id')
    .in('task_id', taskIds);
  
  // Count attachments per task
  const attachmentCountByTask = (attachmentCounts || []).reduce((acc, a) => {
    acc[a.task_id] = (acc[a.task_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // If no assignees, return tasks with attachment counts only
  if (!assigneeRecords || assigneeRecords.length === 0) {
    return tasks.map(task => ({ 
      ...task, 
      assignees: [],
      attachment_count: attachmentCountByTask[task.id] || 0
    })) as Task[];
  }
  
  // Get user details for all assignees
  const userIds = [...new Set(assigneeRecords.map(a => a.user_id))];
  const { data: users, error: usersError } = await supabase
    .from('pd_users')
    .select('*')
    .in('id', userIds);
  
  if (usersError) throw usersError;
  
  // Create user lookup map
  const userMap = (users || []).reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<string, User>);
  
  // Map assignees to tasks
  const assigneesByTask = assigneeRecords.reduce((acc, a) => {
    if (!acc[a.task_id]) acc[a.task_id] = [];
    const user = userMap[a.user_id];
    if (user) acc[a.task_id].push(user);
    return acc;
  }, {} as Record<string, User[]>);
  
  // Attach assignees and attachment counts to tasks
  return tasks.map(task => ({
    ...task,
    assignees: assigneesByTask[task.id] || [],
    attachment_count: attachmentCountByTask[task.id] || 0
  })) as Task[];
}

export async function setTaskAssignees(taskId: string, userIds: string[]) {
  const supabase = createAdminClient();
  
  // Delete existing assignees
  const { error: deleteError } = await supabase
    .from('pd_task_assignees')
    .delete()
    .eq('task_id', taskId);
  
  if (deleteError) throw deleteError;
  
  // Insert new assignees
  if (userIds.length > 0) {
    const { error: insertError } = await supabase
      .from('pd_task_assignees')
      .insert(userIds.map(userId => ({
        task_id: taskId,
        user_id: userId
      })));
    
    if (insertError) throw insertError;
  }
}

export async function addTaskAssignee(taskId: string, userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pd_task_assignees')
    .insert({ task_id: taskId, user_id: userId });
  
  if (error && error.code !== '23505') throw error; // Ignore unique violation
}

export async function removeTaskAssignee(taskId: string, userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pd_task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId);
  
  if (error) throw error;
}

// ============ ATTACHMENTS ============

export interface Attachment {
  id: string;
  task_id: string;
  url: string;
  filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  source: 'upload' | 'slack' | 'api';
  slack_file_id?: string;
  slack_message_ts?: string;
  created_at: string;
}

export async function getTaskAttachments(taskId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pd_task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Attachment[];
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File,
  userId?: string
): Promise<Attachment> {
  const supabase = createAdminClient();
  
  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${taskId}/${timestamp}-${safeName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath);

  // Create attachment record
  const { data, error } = await supabase
    .from('pd_task_attachments')
    .insert({
      task_id: taskId,
      url: publicUrl,
      filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: userId,
      source: 'upload',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Attachment;
}

export async function deleteTaskAttachment(attachmentId: string) {
  const supabase = createAdminClient();
  
  // Get attachment to find storage path
  const { data: attachment } = await supabase
    .from('pd_task_attachments')
    .select('url')
    .eq('id', attachmentId)
    .single();

  if (attachment) {
    // Extract path from URL and delete from storage
    const urlParts = attachment.url.split('/task-attachments/');
    if (urlParts[1]) {
      await supabase.storage
        .from('task-attachments')
        .remove([decodeURIComponent(urlParts[1])]);
    }
  }

  // Delete record
  const { error } = await supabase
    .from('pd_task_attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) throw error;
}
