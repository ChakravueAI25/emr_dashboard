const fs = require('fs');
const path = 'c:/Users/Kaushik/Downloads/finaldash/finaldash/dashbfront-main/src/components/OphthalmicInvestigationsCard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Refs (missing braces)
content = content.replace(/ref=\{\(el\) => fieldRefs\.current\['([^']+)'\] = el\}/g, "ref={(el) => { fieldRefs.current['$1'] = el; }}");

// Fix CSS classes - Standardize field sizes to text-sm/text-xs

// 1. Value/Input fields (text-xl -> text-sm)
content = content.replace(/className="text-white text-center text-xl"/g, 'className="text-white text-center text-sm"');
content = content.replace(/className="text-white text-xl"/g, 'className="text-white text-sm"');

// 2. Labels (text-xl -> text-xs)
content = content.replace(/span className="text\[#8B8B8B\] text-xl"/g, 'span className="text[#8B8B8B] text-xs"');
content = content.replace(/label className="block text\[#8B8B8B\] text-xl mb-2"/g, 'label className="block text[#8B8B8B] text-xs mb-2"');
content = content.replace(/label className="block text\[#8B8B8B\] text-xl mb-3"/g, 'label className="block text[#8B8B8B] text-xs mb-3"');
content = content.replace(/label className="block text\[#D4A574\] text-xl font-semibold mb-3"/g, 'label className="block text[#D4A574] text-sm font-semibold mb-3"');

// 3. Tables (text-xl -> text-sm)
content = content.replace(/table className="w-full text-xl"/g, 'table className="w-full text-sm"');

// 4. Section Headers (h4 text-xl -> text-lg)
content = content.replace(/h4 className="text\[#D4A574\] text-xl"/g, 'h4 className="text[#D4A574] text-lg"');
content = content.replace(/h4 className="text\[#D4A574\] text-xl mb-3"/g, 'h4 className="text[#D4A574] text-lg mb-3"');

// 5. Table Headers - Add text-xs where missing (HVF/Biometry)
content = content.replace(/<th className="text-left p-3 text\[#8B8B8B\] border-r border\[#2a2a2a\]">/g, '<th className="text-left p-3 text[#8B8B8B] border-r border[#2a2a2a] text-xs">');
content = content.replace(/<th className="text-center p-3 text\[#D4A574\] border-r border\[#2a2a2a\]">/g, '<th className="text-center p-3 text[#D4A574] border-r border[#2a2a2a] text-xs">');
content = content.replace(/<th className="text-center p-3 text\[#D4A574\]">/g, '<th className="text-center p-3 text[#D4A574] text-xs">');

// 6. Helper text / Upload UI / Abbreviations
content = content.replace(/gap-2 text-xl"/g, 'gap-2 text-xs"');
content = content.replace(/text-xl cursor-pointer"/g, 'text-xs cursor-pointer"');
content = content.replace(/text-xl text-\[#8B8B8B\]"/g, 'text-sm text-[#8B8B8B]"');
content = content.replace(/text-xl text-\[#6B6B6B\]/g, 'text-xs text-[#6B6B6B]');
content = content.replace(/className="text-\[#8B8B8B\] text-xl mt-2"/g, 'className="text-[#8B8B8B] text-xs mt-2"');
content = content.replace(/className="text-\[#8B8B8B\] text-xl"/g, 'className="text-[#8B8B8B] text-sm"');

fs.writeFileSync(path, content);
console.log('Done');
