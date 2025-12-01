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

        const headers = Object.keys(existingRows[0] || flattenedRow);
        
        const ws = fs.createWriteStream(csvFilePath);
        const csvStream = csv.format({ headers });

        csvStream.pipe(ws).on('finish', () => {
            res.status(200).send('Data saved successfully');
        });

        existingRows.forEach(row => {
            csvStream.write(row);
        });

        csvStream.end();
    }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});