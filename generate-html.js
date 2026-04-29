const fs = require('fs');
const marked = require('marked');

const mdContent = fs.readFileSync('documentation.md', 'utf-8');
const htmlContent = marked.parse(mdContent);

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LearnApp Project Documentation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
        h3 { color: #4a5568; }
        p { margin-bottom: 15px; }
        ul, ol { margin-bottom: 20px; }
        code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        pre { background-color: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        @media print {
            body { padding: 0; max-width: 100%; }
            h2 { page-break-before: always; }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;

fs.writeFileSync('documentation.html', htmlTemplate);
console.log('HTML documentation generated successfully.');
