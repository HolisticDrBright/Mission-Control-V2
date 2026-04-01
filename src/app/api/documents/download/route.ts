import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * GET /api/documents/download?file=filename.pdf
 * Download a file from workspace
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const filename = searchParams.get('file')

    if (!filename) {
      return NextResponse.json(
        { error: 'File parameter required' },
        { status: 400 }
      )
    }

    // Security: only allow specific files from workspace
    const allowedFiles = [
      'Mission_Control_V2_Guide.pdf',
      'MISSION_CONTROL_GUIDE_FOR_COWORKERS.md',
      'COWORKER_QUICK_SETUP.md',
      'MISSION_CONTROL_V2_COMPLETE.md',
      'DOCUMENT_UPLOAD_SYSTEM.md',
      'NOTION_INTEGRATION_STATUS.md',
    ]

    if (!allowedFiles.includes(filename)) {
      return NextResponse.json(
        { error: 'File not found or not allowed' },
        { status: 403 }
      )
    }

    // Read file from workspace
    const workspacePath = process.env.HOME || '/root'
    const filePath = join(workspacePath, '.openclaw/workspace', filename)

    const fileBuffer = await readFile(filePath)

    // Determine MIME type
    let contentType = 'application/octet-stream'
    if (filename.endsWith('.pdf')) {
      contentType = 'application/pdf'
    } else if (filename.endsWith('.md')) {
      contentType = 'text/markdown'
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[api/documents/download]', error)
    return NextResponse.json(
      {
        error: 'Download failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
