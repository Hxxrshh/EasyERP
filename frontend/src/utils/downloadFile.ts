/**
 * Download a binary file safely from the Laravel API
 */
export async function downloadFile(url: string, defaultFilename: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const orgId = localStorage.getItem('active_organization_id');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token || ''}`,
      'X-Organization-Id': orgId || '',
      'Accept': 'application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/json',
    },
  });

  const contentType = response.headers.get('Content-Type') || '';

  if (!response.ok || contentType.includes('application/json')) {
    let errorMessage = `Export failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Not JSON
    }
    throw new Error(errorMessage);
  }

  // Extract filename from Content-Disposition header if available
  let filename = defaultFilename;
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoke object URL after slight delay
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}
