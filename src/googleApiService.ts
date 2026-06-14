// src/googleApiService.ts

export const copyTemplateSpreadsheet = async (accessToken: string): Promise<string | null> => {
  const templateId = import.meta.env.VITE_TEMPLATE_SPREADSHEET_ID;
  if (!templateId) {
    console.error('Template Spreadsheet ID is missing from .env');
    return null;
  }

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Database Aplikasi DompetKu (My Copy)'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to copy spreadsheet:', errorData);
      return null;
    }

    const data = await response.json();
    return data.id; // Returns the ID of the newly copied spreadsheet
  } catch (error) {
    console.error('Error copying spreadsheet:', error);
    return null;
  }
};
