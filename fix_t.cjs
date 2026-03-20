const fs = require('fs');

const filesToFixT = [
  'src/components/properties/ProtocolView.tsx',
  'src/components/properties/PropertyDocumentsHub.tsx',
  'src/components/properties/ProtocolsManager.tsx'
];

filesToFixT.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Match t('en', 'he') or t("en", "he")
    const regex1 = /t\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/g;
    content = content.replace(regex1, "(lang === 'he' ? '$4' : '$2')");
    
    // Match t(`en`, 'he') or t(`en`, "he")
    const regex2 = /t\(\s*`(.*?)`\s*,\s*(['"])(.*?)\2\s*\)/g;
    content = content.replace(regex2, "(lang === 'he' ? '$3' : `$1`)");

    // Match t('en', `he`) or t("en", `he`)
    const regex3 = /t\(\s*(['"])(.*?)\1\s*,\s*`(.*?)`\s*\)/g;
    content = content.replace(regex3, "(lang === 'he' ? `$3` : '$2')");

    fs.writeFileSync(file, content);
  }
});

// Fix SignaturePad button case
const sigPad = 'src/components/properties/SignaturePad.tsx';
if (fs.existsSync(sigPad)) {
  let sigContent = fs.readFileSync(sigPad, 'utf8');
  sigContent = sigContent.replace(/from\s+['"]\.\.\/ui\/button['"]/g, "from '../ui/Button'");
  fs.writeFileSync(sigPad, sigContent);
}

console.log('Fixed translations and button casing.');
