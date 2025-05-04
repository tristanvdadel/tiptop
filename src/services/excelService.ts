
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

    if (!data || data.length === 0) {
      console.error("Geen data gevonden in het bestand");
      throw new Error("Geen data gevonden in het bestand");
    }

    console.log("Gegevens in bestand gevonden:", data);

    // Probeer naam en uren kolommen te detecteren door verschillende strategieën
    let nameColumn: string | null = null;
    let hoursColumn: string | null = null;
    
    // 1. Zoek naar veelvoorkomende kolomnamen
    const headers = Object.keys(data[0] || {});
    
    const nameColumnCandidates = headers.filter(header => 
      /naam|name|persoon|medewerker|employee|werknemer|gebruiker|user/i.test(header)
    );
    
    const hoursColumnCandidates = headers.filter(header => 
      /uren|uur|hours|hour|tijd|time|gewerkt/i.test(header)
    );
    
    if (nameColumnCandidates.length > 0) {
      nameColumn = nameColumnCandidates[0];
      console.log(`Naamkolom gevonden via naam matching: ${nameColumn}`);
    }
    
    if (hoursColumnCandidates.length > 0) {
      hoursColumn = hoursColumnCandidates[0];
      console.log(`Urenkolom gevonden via naam matching: ${hoursColumn}`);
    }

    // 2. Als we geen kolommen konden vinden op basis van naam, probeer dan waarden te analyseren
    if (!nameColumn) {
      // Zoek naar een kolom die hoofdzakelijk tekst bevat (waarschijnlijk namen)
      for (const header of headers) {
        const values = data.map(row => row[header]);
        const textValueCount = values.filter(value => typeof value === 'string' && isNaN(Number(value))).length;
        
        if (textValueCount > data.length * 0.7) {  // Als meer dan 70% van de waarden tekst is
          nameColumn = header;
          console.log(`Naamkolom gevonden via data-analyse: ${nameColumn}`);
          break;
        }
      }
    }
    
    if (!hoursColumn) {
      // Zoek naar een kolom die hoofdzakelijk numeriek is (waarschijnlijk uren)
      for (const header of headers) {
        if (header === nameColumn) continue; // Sla de naamkolom over
        
        const values = data.map(row => {
          const val = row[header];
          return typeof val === 'string' ? val.replace(',', '.') : val;
        });
        
        const numericValueCount = values.filter(value => 
          (typeof value === 'number' || 
          (typeof value === 'string' && !isNaN(Number(value)))) && 
          Number(value) >= 0 && Number(value) <= 24
        ).length;
        
        if (numericValueCount > data.length * 0.7) {  // Als meer dan 70% van de waarden getallen zijn
          hoursColumn = header;
          console.log(`Urenkolom gevonden via data-analyse: ${hoursColumn}`);
          break;
        }
      }
    }

    // 3. Als nog geen kolommen zijn gevonden, probeer de eerste twee kolommen
    if (!nameColumn && headers.length > 0) {
      nameColumn = headers[0];
      console.log(`Naamkolom standaard eerste kolom: ${nameColumn}`);
    }
    
    if (!hoursColumn && headers.length > 1) {
      // Gebruik de eerste kolom die niet de naamkolom is
      hoursColumn = headers.find(h => h !== nameColumn) || headers[1];
      console.log(`Urenkolom standaard: ${hoursColumn}`);
    }

    // Als nog steeds geen kolommen zijn gevonden, return lege array
    if (!nameColumn || !hoursColumn) {
      console.error("Geen geschikte kolommen gevonden voor namen en uren");
      throw new Error("Geen geschikte kolommen gevonden voor namen en uren");
    }

    console.log(`Geselecteerde kolommen: Naam="${nameColumn}", Uren="${hoursColumn}"`);

    // Huidige datum als string in ISO formaat
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Extraheer de data en filter lege rijen
    const extractedData = data
      .filter(row => row[nameColumn] !== undefined && row[nameColumn] !== null)
      .map(row => {
        // Haal naam op en verwijder extra spaties
        const name = String(row[nameColumn]).trim();
        
        // Converteer uren naar een nummer, vervang komma door punt indien nodig
        let hourValue = row[hoursColumn];
        if (hourValue === undefined || hourValue === null) {
          hourValue = 0;
        }
        
        const hourString = String(hourValue).replace(',', '.');
        let hours = parseFloat(hourString);
        
        // Valideer uren (moet een positief getal zijn)
        hours = !isNaN(hours) && hours >= 0 ? hours : 0;
        
        return {
          name,
          hours,
          date: currentDate,
        };
      })
      .filter(item => item.name && item.name.trim() !== ''); // Filter rijen zonder naam

    console.log(`Geëxtraheerde data (${extractedData.length} rijen):`, extractedData);

    return extractedData;
  } catch (error) {
    console.error("Error extracting hours from Excel:", error);
    throw new Error("Fout bij het extraheren van uren uit Excel bestand");
  }
};
