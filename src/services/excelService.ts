
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
    console.log("Starting Excel extraction for file:", file.name);
    const fileData = await file.arrayBuffer();
    console.log("File data loaded into array buffer");
    
    const wb = XLSX.read(fileData);
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<any>(firstSheet);

    console.log("Excel data parsed, rows found:", data.length);

    if (data.length === 0) {
      console.error("No data found in file");
      throw new Error("Geen gegevens gevonden in het bestand");
    }

    // Log the structure of the first row to help with debugging
    console.log("First row structure:", Object.keys(data[0]));
    
    // Specifiek zoeken naar kolommen voor namen en gewerkte uren
    const headers = Object.keys(data[0] || {});
    
    // Verbeterde detectie voor naamkolom (Dutch and English keywords)
    const nameColumnCandidates = headers.filter(header => 
      /naam|name|persoon|medewerker|employee|werknemer|teamlid/i.test(header)
    );
    
    // Verbeterde detectie voor urenkolom (Dutch and English keywords)
    const hoursColumnCandidates = headers.filter(header => 
      /uren|uur|hours|hour|gewerkte|worked|gewerkt/i.test(header)
    );
    
    console.log("Name column candidates:", nameColumnCandidates);
    console.log("Hours column candidates:", hoursColumnCandidates);
    
    let nameColumn = nameColumnCandidates[0];
    let hoursColumn = hoursColumnCandidates[0];

    // Als de automatische detectie faalt, probeer kolommen te vinden die de woorden bevatten
    if (!nameColumn) {
      nameColumn = headers.find(h => 
        h.toLowerCase().includes('naam') || 
        h.toLowerCase().includes('name') || 
        h.toLowerCase().includes('medewerker') ||
        h.toLowerCase().includes('employee') ||
        h.toLowerCase().includes('person')
      ) || '';
      console.log("Fallback name column search result:", nameColumn);
    }
    
    if (!hoursColumn) {
      hoursColumn = headers.find(h => 
        h.toLowerCase().includes('uur') || 
        h.toLowerCase().includes('uren') || 
        h.toLowerCase().includes('gewerkt') || 
        h.toLowerCase().includes('hour') ||
        h.toLowerCase().includes('hours') ||
        h.toLowerCase().includes('worked')
      ) || '';
      console.log("Fallback hours column search result:", hoursColumn);
    }

    // Als nog steeds geen kolommen zijn gevonden, probeer de eerste twee kolommen
    if (!nameColumn && headers.length > 0) {
      nameColumn = headers[0];
      console.log("Using first column as name column:", nameColumn);
    }
    
    if (!hoursColumn && headers.length > 1) {
      hoursColumn = headers[1];
      console.log("Using second column as hours column:", hoursColumn);
    }

    // Als nog steeds geen kolommen zijn gevonden, return lege array
    if (!nameColumn || !hoursColumn) {
      console.error("Geen geschikte kolommen gevonden voor naam en uren");
      return [];
    }

    console.log(`Gedetecteerde kolommen: Naam=${nameColumn}, Uren=${hoursColumn}`);

    // Huidige datum als string in ISO formaat
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Extraheer de data en filter lege rijen
    const extractedData = data
      .filter(row => row[nameColumn] && row[hoursColumn] !== undefined)
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
    
    console.log(`Extracted ${extractedData.length} valid entries from Excel file`);
    
    return extractedData;
  } catch (error) {
    console.error("Error extracting hours from Excel:", error);
    throw new Error("Fout bij het extraheren van uren uit Excel bestand");
  }
};
