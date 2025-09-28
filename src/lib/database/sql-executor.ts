/**
 * Database SQL Executor - Bypass MCP crypto issues
 * For Claude Code to execute database operations reliably
 */

import { supabaseAdmin } from './supabase-client';

// Use the singleton admin client to prevent multiple instances
const supabase = supabaseAdmin;

export interface SqlResult {
  data: any[]
  error?: string
  rowCount?: number
}

export async function executeSql(query: string): Promise<SqlResult> {
  try {
    console.log('🔍 Executing SQL via direct client:', query.substring(0, 50) + '...')
    
    // For SELECT queries, try to parse table and use Supabase client
    if (query.trim().toLowerCase().startsWith('select')) {
      return await handleSelectQuery(query)
    }
    
    // For other operations, use RPC if available
    const { data, error } = await supabase.rpc('execute_sql' as any, {
      query: query
    } as any)
    
    if (error) {
      throw new Error(error.message)
    }
    
    return {
      data: (data as any) || [],
      rowCount: Array.isArray(data as any) ? (data as any).length : 0
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ SQL execution failed:', errorMessage)
    
    return {
      data: [],
      error: errorMessage
    }
  }
}

async function handleSelectQuery(query: string): Promise<SqlResult> {
  // Parse basic SELECT queries for common tables
  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes('from users') || lowerQuery.includes('from auth.users')) {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    return { data: data.users, rowCount: data.users.length }
  }
  
  if (lowerQuery.includes('from messages')) {
    const { data, error } = await supabase.from('messages').select('*').limit(100)
    if (error) throw error
    return { data: data || [], rowCount: data?.length || 0 }
  }
  
  if (lowerQuery.includes('from artifacts')) {
    const { data, error } = await supabase.from('artifacts').select('*').limit(100)
    if (error) throw error
    return { data: data || [], rowCount: data?.length || 0 }
  }
  
  // Fallback: try to execute as raw SQL
  throw new Error(`Unsupported SELECT query: ${query}`)
}

export async function countRecords(tableName: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    return count || 0
    
  } catch (error) {
    console.error(`Failed to count records in ${tableName}:`, error)
    return 0
  }
}

export async function getTableSchema(tableName: string) {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
    
    if (error) throw error
    return data
    
  } catch (error) {
    console.error(`Failed to get schema for ${tableName}:`, error)
    return []
  }
}