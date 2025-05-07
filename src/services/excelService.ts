
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

    if (data.length === 0) {
      throw new Error("Geen gegevens gevonden in het bestand");
    }

    // Specifiek zoeken naar kolommen voor namen en gewerkte uren
    const headers = Object.keys(data[0] || {});
    
    // Verbeterde detectie voor naamkolom
    const nameColumnCandidates = headers.filter(header => 
      /naam|name|persoon|medewerker|employee|werknemer|teamlid/i.test(header)
    );
    
    // Verbeterde detectie voor urenkolom
    const hoursColumnCandidates = headers.filter(header => 
      /uren|uur|hours|hour|gewerkte|worked/i.test(header)
    );
    
    let nameColumn = nameColumnCandidates[0];
    let hoursColumn = hoursColumnCandidates[0];

    // Als de automatische detectie faalt, probeer kolommen te vinden die de woorden bevatten
    if (!nameColumn) {
      nameColumn = headers.find(h => h.toLowerCase().includes('naam') || 
                                      h.toLowerCase().includes('name') || 
                                      h.toLowerCase().includes('medewerker')) || '';
    }
    
    if (!hoursColumn) {
      hoursColumn = headers.find(h => h.toLowerCase().includes('uur') || 
                                       h.toLowerCase().includes('uren') || 
                                       h.toLowerCase().includes('gewerkt') || 
                                       h.toLowerCase().includes('hour')) || '';
    }

    // Als nog steeds geen kolommen zijn gevonden, probeer de eerste twee kolommen
    if (!nameColumn && headers.length > 0) nameColumn = headers[0];
    if (!hoursColumn && headers.length > 1) hoursColumn = headers[1];

    // Als nog steeds geen kolommen zijn gevonden, return lege array
    if (!nameColumn || !hoursColumn) {
      console.error("Geen geschikte kolommen gevonden voor naam en uren");
      return [];
    }

    console.log(`Gedetecteerde kolommen: Naam=${nameColumn}, Uren=${hoursColumn}`);

    // Huidige datum als string in ISO formaat
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Extraheer de data en filter lege rijen
    return data
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
  } catch (error) {
    console.error("Error extracting hours from Excel:", error);
    throw new Error("Fout bij het extraheren van uren uit Excel bestand");
  }
};
