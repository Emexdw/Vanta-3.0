#!/usr/bin/env python3
"""Static beta preflight: no dependency installation or database changes."""
from pathlib import Path
import json, sys
root = Path(__file__).resolve().parents[1]
checks = {
    'Web entrypoint': root / 'src/main.tsx',
    'Web package': root / 'package.json',
    'Mobile Expo package': root / 'mobile/package.json',
    'Mobile router': root / 'mobile/app/_layout.tsx',
    'Mobile profile editor': root / 'mobile/app/edit-profile.tsx',
    'Mobile explore': root / 'mobile/app/(tabs)/explore.tsx',
    'Mobile clips': root / 'mobile/app/(tabs)/clips.tsx',
    'Mobile notifications': root / 'mobile/app/(tabs)/activity.tsx',
    'Supabase base schema': root / 'supabase/schema.sql',
    'Supabase chat migration': root / 'supabase/002_seguridad_y_chat.sql',
    'Supabase profile migration': root / 'supabase/003_personalizacion_perfiles.sql',
    'Supabase performance migration': root / 'supabase/004_seguridad_y_rendimiento.sql',
}
failed = 0
for label, path in checks.items():
    ok = path.is_file()
    print(('OK  ' if ok else 'FAIL') + ' ' + label)
    failed += not ok
for name in ('package.json', 'mobile/package.json'):
    try:
        data = json.loads((root / name).read_text())
        assert isinstance(data.get('scripts'), dict)
        print('OK   valid JSON and scripts: ' + name)
    except Exception as exc:
        print('FAIL ' + name + ': ' + str(exc))
        failed += 1
print('Static preflight:', 'PASS' if not failed else f'{failed} FAILURES')
print('This does not verify TypeScript, Expo, RLS, SQL execution, or real devices.')
sys.exit(bool(failed))
