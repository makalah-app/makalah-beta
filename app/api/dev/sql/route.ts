/**
 * Development SQL API - For Claude Code database operations
 * Bypasses MCP crypto issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeSql, countRecords, getTableSchema } from '@/lib/database/sql-executor'

export async function POST(request: NextRequest) {
  try {
    const { query, operation, table } = await request.json()
    
    // Security check - only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'SQL API only available in development' },
        { status: 403 }
      )
    }
    
    let result
    
    switch (operation) {
      case 'execute':
        if (!query) {
          return NextResponse.json(
            { error: 'Query required for execute operation' },
            { status: 400 }
          )
        }
        result = await executeSql(query)
        break
        
      case 'count':
        if (!table) {
          return NextResponse.json(
            { error: 'Table name required for count operation' },
            { status: 400 }
          )
        }
        const count = await countRecords(table)
        result = { data: [{ count }], rowCount: 1 }
        break
        
      case 'schema':
        if (!table) {
          return NextResponse.json(
            { error: 'Table name required for schema operation' },
            { status: 400 }
          )
        }
        const schema = await getTableSchema(table)
        result = { data: schema, rowCount: schema.length }
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: execute, count, or schema' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      operation,
      ...result
    })
    
  } catch (error) {
    console.error('SQL API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const operation = searchParams.get('operation')
  const table = searchParams.get('table')
  
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'SQL API only available in development' },
        { status: 403 }
      )
    }
    
    switch (operation) {
      case 'count':
        if (!table) {
          return NextResponse.json(
            { error: 'Table parameter required' },
            { status: 400 }
          )
        }
        const count = await countRecords(table)
        return NextResponse.json({ table, count })
        
      case 'schema':
        if (!table) {
          return NextResponse.json(
            { error: 'Table parameter required' },
            { status: 400 }
          )
        }
        const schema = await getTableSchema(table)
        return NextResponse.json({ table, schema })
        
      default:
        return NextResponse.json({
          message: 'SQL Development API',
          usage: {
            'GET ?operation=count&table=users': 'Count records in table',
            'GET ?operation=schema&table=users': 'Get table schema',
            'POST {operation: "execute", query: "SELECT..."}': 'Execute SQL query'
          }
        })
    }
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}