
import * as XLSX from 'xlsx';

export interface ExtractedHourData {
  name: string;
  hours: number;
  date: string;
}

/**
 * Verwerkt een Excel of CSV bestand en extraheert de uren data
 * @param file Het Excel of CSV bestand
 * @returns Belofte met geëxtraheerde uren data
 */
export const extractHoursFromExcel = async (file: File): Promise<ExtractedHourData[]> => {
  try {
    const fileData = await file.arrayBuffer();
    const wb = XLSX.read(fileData);
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<any>(firstSheet);

    // Probeer naam en uren kolommen te detecteren
    const headers = Object.keys(data[0] || {});
    const nameColumnCandidates = headers.filter(header => 
      /naam|name|persoon|medewerker|employee|werknemer/i.test(header)
    );
    const hoursColumnCandidates = headers.filter(header => 
      /uren|uur|hours|hour/i.test(header)
    );
    
    let nameColumn = nameColumnCandidates[0];
    let hoursColumn = hoursColumnCandidates[0];

    // Als geen kolommen zijn gevonden, probeer de eerste twee kolommen
    if (!nameColumn && headers.length > 0) nameColumn = headers[0];
    if (!hoursColumn && headers.length > 1) hoursColumn = headers[1];

    // Als nog steeds geen kolommen zijn gevonden, return lege array
    if (!nameColumn || !hoursColumn) return [];

    // Huidige datum als string in ISO formaat
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Extraheer de data
    return data
      .filter(row => row[nameColumn] && row[hoursColumn])
      .map(row => {
        const name = String(row[nameColumn]).trim();
        // Converteer uren naar een nummer, vervang komma door punt indien nodig
        const hourString = String(row[hoursColumn]).replace(',', '.');
        const hours = parseFloat(hourString);
        
        return {
          name,
          hours: isNaN(hours) ? 0 : hours,
          date: currentDate,
        };
      });
  } catch (error) {
    console.error("Error extracting hours from Excel:", error);
    throw new Error("Fout bij het extraheren van uren uit Excel bestand");
  }
};
