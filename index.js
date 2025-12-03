const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post('/data', (req, res) => {
    const { fileName, row: newRowData } = req.body;

    if (!fileName) {
        return res.status(400).send('Filename is required.');
    }

    // Basic security measure to prevent directory traversal
    const safeFilename = path.basename(fileName);
    const csvFilePath = path.join(__dirname, safeFilename);

    const flattenedRow = {
        ID: newRowData.id,
        Timestamp: newRowData.timestamp,
        'Button Name': newRowData.buttonName,
        Pitch: newRowData.pitch,
        Roll: newRowData.roll,
        Heading: newRowData.heading,
        Latitude: newRowData.lat,
        Longitude: newRowData.lon,
        Remarks: newRowData.remarks,
        ...newRowData.customData,
    };

    let rows = [];
    if (fs.existsSync(csvFilePath)) {
        fs.createReadStream(csvFilePath)
            .pipe(csv.parse({ headers: true }))
            .on('error', (error) => {
                console.error(error);
                return res.status(500).send('Error reading CSV file.');
            })
            .on('data', (row) => rows.push(row))
            .on('end', () => {
                writeData(rows);
            });
    } else {
        writeData([]);
    }

    function writeData(existingRows) {
        const rowIndex = existingRows.findIndex((row) => row.ID == flattenedRow.ID);

        if (rowIndex !== -1) {
            existingRows[rowIndex] = flattenedRow;
        } else {
            existingRows.push(flattenedRow);
        }

        const allHeaders = new Set();
        existingRows.forEach(row => {
          Object.keys(row).forEach(header => {
            allHeaders.add(header);
          });
        });
        Object.keys(flattenedRow).forEach(header => {
          allHeaders.add(header);
        });

        const finalHeaders = Array.from(allHeaders);
        
        const ws = fs.createWriteStream(csvFilePath);
        const csvStream = csv.format({ headers: finalHeaders });

        csvStream.pipe(ws).on('finish', () => {
            res.status(200).send('Data saved successfully');
        });

        existingRows.forEach(row => {
            csvStream.write(row);
        });

        csvStream.end();
    }
});

function flattenObject(obj, parentKey = '') {
    let result = {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const propName = parentKey ? `${parentKey}_${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                Object.assign(result, flattenObject(obj[key], propName));
            } else if (Array.isArray(obj[key])) {
                obj[key].forEach((item, index) => {
                    Object.assign(result, flattenObject(item, `${propName}_${index}`));
                });
            } else {
                result[propName] = obj[key];
            }
        }
    }

    return result;
}

app.post('/divelog', (req, res) => {
    const diveLogData = req.body;
    const diveNo = diveLogData.diveNo || 'dive';
    const projNo = diveLogData.projNo || 'project';
    const filename = `${projNo}_${diveNo}.csv`;
    const filePath = path.join(__dirname, filename);

    const flattenedData = flattenObject(diveLogData);
    
    const headers = Object.keys(flattenedData);
    const rows = [flattenedData];

    const ws = fs.createWriteStream(filePath);
    csv.write(rows, { headers: headers }).pipe(ws).on('finish', () => {
        res.status(200).send('Dive log saved successfully.');
    });
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});