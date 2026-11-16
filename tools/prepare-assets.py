from pathlib import Path
from PIL import Image
import shutil

site = Path(__file__).resolve().parents[1]
workspace = site.parent
game = workspace / 'BibleJourneyGame'
art = workspace / 'BibleJourney-ArtConceptFolder-New'
sources = {
    'city': game/'BibleJourneyUnity/Assets/_BibleJourney/Resources/Messenger/TitleBackdrop.png',
    'gameplay': game/'Docs/QA/TheMessenger/ControlsElder/icons-only-phone.png',
    'rooftops': game/'Docs/Maps/Look_06_FromTheRopeTower.png',
    'market': game/'Docs/Maps/Look_03_Market.png',
    'waterfront': game/'Docs/Maps/Look_12_LakeShore.png',
    'tychicus': art/'Tychicus/TychicusThreeQuarters.png',
    'roman': art/'RomanSoldier/RomanSoldier01/FrontRomanSoldier.png',
    'house': art/'BuildingsNew/NuevasCasas/NewHouse01.png',
    'tower': art/'BuildingsNew/NuevasCasas/HighTower01.png',
}
for name, path in sources.items():
    image = Image.open(path).convert('RGB')
    image.thumbnail((1920, 1200) if name in ['city','gameplay'] else (1200,1000))
    image.save(site/'assets'/f'{name}.webp', quality=86, method=6)
    if name == 'city':
        image.save(site/'assets'/'social.jpg', quality=85)
for name in ['Cinzel.ttf','Lato-Regular.ttf','Cinzel-OFL.txt','Lato-OFL.txt']:
    shutil.copy2(game/'Tools/TheMessenger'/name, site/'assets'/name)
print('Prepared', len(sources), 'images and licensed local fonts.')
