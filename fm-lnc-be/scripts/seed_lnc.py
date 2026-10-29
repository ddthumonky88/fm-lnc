import os
import re
import psycopg2
from psycopg2.extras import execute_batch

def seed():
    host = os.environ.get('DB_HOST', '127.0.0.1')
    port = int(os.environ.get('DB_PORT', '5432'))
    user = os.environ.get('DB_USERNAME', 'postgres')
    password = os.environ.get('DB_PASSWORD', '123456')
    dbname = os.environ.get('DB_NAME', 'fm_lnc_db')
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    lnc_dir = os.path.abspath(os.path.join(script_dir, '../..'))

    print(f"Connecting to database {dbname} on {host}:{port}...")
    conn = psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("Recreating database tables...")
    cur.execute("""
    DROP TABLE IF EXISTS people CASCADE;
    DROP TABLE IF EXISTS stages CASCADE;
    DROP TABLE IF EXISTS awards CASCADE;
    DROP TABLE IF EXISTS stadiums CASCADE;
    DROP TABLE IF EXISTS clubs CASCADE;
    DROP TABLE IF EXISTS competitions CASCADE;
    DROP TABLE IF EXISTS cities CASCADE;
    DROP TABLE IF EXISTS nations CASCADE;
    DROP TABLE IF EXISTS confederations CASCADE;

    CREATE TABLE confederations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    );

    CREATE TABLE nations (
        id VARCHAR(64) PRIMARY KEY,
        name_lg VARCHAR(255) NOT NULL,
        name_sh VARCHAR(255) NOT NULL,
        name_3l VARCHAR(50) NOT NULL,
        confed_id VARCHAR(64),
        inactive_fields TEXT
    );

    CREATE TABLE cities (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nation_id VARCHAR(64),
        region VARCHAR(255),
        is_disabled BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE competitions (
        id VARCHAR(64) PRIMARY KEY,
        name_lg VARCHAR(255) NOT NULL,
        name_sh VARCHAR(255) NOT NULL,
        name_3l VARCHAR(50),
        fg_color VARCHAR(100),
        bg_color VARCHAR(100),
        confed_id VARCHAR(64),
        nation_id VARCHAR(64),
        type VARCHAR(255),
        parent_id VARCHAR(64),
        note TEXT,
        inactive_fields TEXT
    );

    CREATE TABLE clubs (
        id VARCHAR(64) PRIMARY KEY,
        name_lg VARCHAR(255) NOT NULL,
        name_sh VARCHAR(255) NOT NULL,
        name_6l VARCHAR(50),
        name_3l VARCHAR(50),
        nation_id VARCHAR(64),
        comp_id VARCHAR(64),
        note TEXT,
        inactive_fields TEXT,
        is_extinct BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE stadiums (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nation_id VARCHAR(64),
        type VARCHAR(50) DEFAULT 'stadium',
        is_disabled BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE awards (
        id VARCHAR(64) PRIMARY KEY,
        name_lg VARCHAR(255) NOT NULL,
        name_sh VARCHAR(255) NOT NULL,
        nation_id VARCHAR(64),
        comp_id VARCHAR(64),
        inactive_fields TEXT
    );

    CREATE TABLE people (
        id VARCHAR(64) PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        common_name VARCHAR(255) DEFAULT '',
        second_name VARCHAR(255) NOT NULL
    );

    CREATE TABLE stages (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    );
    """)

    # 1. Confederations
    confeds = [
        (1, 'CAF'),
        (2, 'AFC'),
        (3, 'UEFA'),
        (4, 'CONCACAF'),
        (5, 'OFC'),
        (6, 'CONMEBOL'),
        (7, 'World'),
        (8, 'EXTINCT')
    ]
    execute_batch(cur, "INSERT INTO confederations (id, name) VALUES (%s, %s);", confeds)
    conn.commit()

    confed_name_map = {
        'CAF': 1, 'AFRICA': 1,
        'AFC': 2, 'ASIA': 2,
        'UEFA': 3, 'EUROPE': 3,
        'CONCACAF': 4, 'NORTH AMERICA': 4,
        'OFC': 5, 'OCEANIA': 5,
        'CONMEBOL': 6, 'SOUTH AMERICA': 6,
        'WORLD': 7, 'INTERNATIONAL': 7, 'FIFA': 7,
        'EXTINCT': 8, 'OTHER': 8
    }

    # 2. Parse City & Nation
    file_cn = os.path.join(lnc_dir, 'FM24 - City & Nation.lnc')
    print(f"Reading {file_cn}...")
    nations = {}
    cities = {}
    cur_confed_id = 7
    cur_city_code = None
    cur_city_nat_name = None
    cur_city_cat = None

    with open(file_cn, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            l = line.strip()
            if not l: continue
            if l.startswith('#'):
                h = l.lstrip('#').strip()
                if h.startswith('NATION >'):
                    parts = [p.strip() for p in h.split('>')]
                    cname = parts[1].upper() if len(parts) > 1 else 'OTHER'
                    cur_confed_id = confed_name_map.get(cname, 7)
                    continue
                elif h.startswith('CITY >'):
                    parts = [p.strip() for p in h.split('>')]
                    if len(parts) > 1:
                        m = re.search(r'\[([A-Z0-9]+)\]\s*(.*)', parts[1])
                        if m:
                            cur_city_code = m.group(1).strip()
                            cur_city_nat_name = m.group(2).strip()
                        else:
                            cur_city_code = None
                            cur_city_nat_name = parts[1].strip()
                    cur_city_cat = parts[2].strip() if len(parts) > 2 else None
                    continue

                m_comm = re.match(r'^#\s*"([^"]+)"\s+(\d+)\s+"([^"]*)"', l)
                if m_comm:
                    cmd, id_val, val = m_comm.group(1), int(m_comm.group(2)), m_comm.group(3).strip()
                    if cmd == 'NATION_LONG_NAME_CHANGE':
                        if id_val not in nations: nations[id_val] = {'confed_id': cur_confed_id, 'inactive_fields': set()}
                        nations[id_val]['long_name'] = val
                        nations[id_val].setdefault('inactive_fields', set()).add('name_lg')
                    elif cmd == 'NATION_SHORT_NAME_CHANGE':
                        if id_val not in nations: nations[id_val] = {'confed_id': cur_confed_id, 'inactive_fields': set()}
                        nations[id_val]['short_name'] = val
                        nations[id_val].setdefault('inactive_fields', set()).add('name_sh')
                    elif cmd == 'NATION_3LETTER_NAME_CHANGE':
                        if id_val not in nations: nations[id_val] = {'confed_id': cur_confed_id, 'inactive_fields': set()}
                        nations[id_val]['three_letter_name'] = val
                        nations[id_val].setdefault('inactive_fields', set()).add('name_3l')
                    elif cmd == 'CITY_NAME_CHANGE':
                        cities[id_val] = {
                            'name': val,
                            'nation_code': cur_city_code,
                            'nation_name': cur_city_nat_name,
                            'category': cur_city_cat,
                            'inactive_fields': {'name'}
                        }
                continue

            m = re.match(r'^"([^"]+)"\s+(\d+)\s+"([^"]*)"', l)
            if m:
                cmd, id_val, val = m.group(1), int(m.group(2)), m.group(3).strip()
                if cmd == 'NATION_LONG_NAME_CHANGE':
                    if id_val not in nations: nations[id_val] = {'confed_id': cur_confed_id, 'inactive_fields': set()}
                    nations[id_val]['long_name'] = val
                    nations[id_val].setdefault('inactive_fields', set()).discard('name_lg')
                elif cmd == 'NATION_SHORT_NAME_CHANGE':
                    if id_val not in nations: nations[id_val] = {'confed_id': cur_confed_id, 'inactive_fields': set()}
                    nations[id_val]['short_name'] = val
                    nations[id_val].setdefault('inactive_fields', set()).discard('name_sh')
                elif cmd == 'NATION_3LETTER_NAME_CHANGE':
                    if id_val not in nations: nations[id_val] = {'confed_id': cur_confed_id, 'inactive_fields': set()}
                    nations[id_val]['three_letter_name'] = val
                    nations[id_val].setdefault('inactive_fields', set()).discard('name_3l')
                elif cmd == 'CITY_NAME_CHANGE':
                    cities[id_val] = {
                        'name': val,
                        'nation_code': cur_city_code,
                        'nation_name': cur_city_nat_name,
                        'category': cur_city_cat,
                        'inactive_fields': set()
                    }

    code_to_nation_id = {}
    name_to_nation_id = {}
    nations_batch = []
    for nid, ndata in nations.items():
        lname = ndata.get('long_name', f'Nation {nid}')
        sname = ndata.get('short_name', lname)
        code = ndata.get('three_letter_name', 'UNK')
        cid = ndata.get('confed_id', 7)
        inact_set = ndata.get('inactive_fields')
        inact_str = ','.join(sorted(inact_set)) if inact_set else None
        nations_batch.append((nid, lname, sname, code, cid, inact_str))
        code_to_nation_id[code] = nid
        name_to_nation_id[lname.upper()] = nid
        name_to_nation_id[sname.upper()] = nid

    execute_batch(cur, """
        INSERT INTO nations (id, name_lg, name_sh, name_3l, confed_id, inactive_fields)
        VALUES (%s, %s, %s, %s, %s, %s);
    """, nations_batch, page_size=1000)
    conn.commit()

    cities_batch = []
    for cid, cdata in cities.items():
        cname = cdata['name']
        nat_id = None
        if cdata['nation_code'] and cdata['nation_code'] in code_to_nation_id:
            nat_id = code_to_nation_id[cdata['nation_code']]
        elif cdata['nation_name']:
            nat_id = name_to_nation_id.get(cdata['nation_name'].upper())
        inact_set = cdata.get('inactive_fields')
        cities_batch.append((cid, cname, nat_id, cdata['category'], bool(inact_set)))

    execute_batch(cur, """
        INSERT INTO cities (id, name, nation_id, region, is_disabled)
        VALUES (%s, %s, %s, %s, %s);
    """, cities_batch, page_size=1000)
    conn.commit()

    # 3. Parse Competition & Other
    file_co = os.path.join(lnc_dir, 'FM24 - Competition & Other.lnc')
    print(f"Reading {file_co}...")
    comps = {}
    awards = {}
    people = {}
    stages = {}
    cur_confed_id = 7
    cur_nat_code = None
    cur_cat = None

    with open(file_co, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            l = line.strip()
            if not l: continue
            if l.startswith('#'):
                h = l.lstrip('#').strip()
                if h.startswith('COMP >'):
                    parts = [p.strip() for p in h.split('>')]
                    cf = parts[1].upper() if len(parts) > 1 else 'OTHER'
                    cur_confed_id = confed_name_map.get(cf, 7)
                    cur_nat_code = None
                    if len(parts) > 2:
                        m = re.search(r'\[([A-Z0-9]+)\]\s*(.*)', parts[2])
                        if m: cur_nat_code = m.group(1).strip()
                    cur_cat = parts[3].strip() if len(parts) > 3 else None
                    continue
                elif h.startswith('AWARDS >'):
                    parts = [p.strip() for p in h.split('>')]
                    cf = parts[1].upper() if len(parts) > 1 else 'OTHER'
                    cur_confed_id = confed_name_map.get(cf, 7)
                    cur_nat_code = None
                    if len(parts) > 2:
                        m = re.search(r'\[([A-Z0-9]+)\]\s*(.*)', parts[2])
                        if m: cur_nat_code = m.group(1).strip()
                    cur_cat = parts[3].strip() if len(parts) > 3 else None
                    continue

                # Commented command for competition / awards
                m_parent_comm = re.match(r'^#\s*"COMP_PARENT_ID"\s+(\d+)\s+(\d+)', l)
                if m_parent_comm:
                    cid, pid = int(m_parent_comm.group(1)), int(m_parent_comm.group(2))
                    if cid not in comps:
                        comps[cid] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                    comps[cid]['parent_id'] = pid
                    comps[cid].setdefault('inactive_fields', set()).add('parent_id')
                    continue

                m_col_comm = re.match(r'^#\s*"COMP_COLOUR_CHANGE"\s+(\d+)\s+([0-9\s]+)\s+""', l)
                if m_col_comm:
                    cid, col_tokens = int(m_col_comm.group(1)), m_col_comm.group(2).strip().split()
                    if cid not in comps:
                        comps[cid] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                    if len(col_tokens) >= 7:
                        offset = 2 if len(col_tokens) >= 8 else 1
                        comps[cid]['fg_color'] = f"{col_tokens[offset]} {col_tokens[offset+1]} {col_tokens[offset+2]}"
                        comps[cid]['bg_color'] = f"{col_tokens[offset+3]} {col_tokens[offset+4]} {col_tokens[offset+5]}"
                        comps[cid].setdefault('inactive_fields', set()).add('colors')
                    continue

                m_comm = re.match(r'^#\s*"([^"]+)"\s+(\d+)\s+"([^"]*)"', l)
                if m_comm:
                    cmd, id_val, val = m_comm.group(1), int(m_comm.group(2)), m_comm.group(3).strip()
                    if cmd in ('COMP_LONG_NAME_CHANGE', 'COMP_SHORT_NAME_CHANGE', 'COMP_3LETTER_NAME_CHANGE'):
                        if id_val not in comps:
                            comps[id_val] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                        if cmd == 'COMP_LONG_NAME_CHANGE':
                            comps[id_val]['long_name'] = val
                            comps[id_val].setdefault('inactive_fields', set()).add('name_lg')
                        elif cmd == 'COMP_SHORT_NAME_CHANGE':
                            comps[id_val]['short_name'] = val
                            comps[id_val].setdefault('inactive_fields', set()).add('name_sh')
                        elif cmd == 'COMP_3LETTER_NAME_CHANGE':
                            comps[id_val]['three_letter_name'] = val
                            comps[id_val].setdefault('inactive_fields', set()).add('name_3l')
                    elif cmd in ('AWARD_LONG_NAME_CHANGE', 'AWARD_SHORT_NAME_CHANGE'):
                        if id_val not in awards:
                            awards[id_val] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                        if cmd == 'AWARD_LONG_NAME_CHANGE':
                            awards[id_val]['long_name'] = val
                            awards[id_val].setdefault('inactive_fields', set()).add('name_lg')
                        elif cmd == 'AWARD_SHORT_NAME_CHANGE':
                            awards[id_val]['short_name'] = val
                            awards[id_val].setdefault('inactive_fields', set()).add('name_sh')
                continue

            if 'CHANGE_PLAYER_NAME' in l:
                quotes = re.findall(r'"([^"]*)"', l)
                m_id = re.search(r'"CHANGE_PLAYER_NAME"\s+(\d+)', l)
                if m_id and len(quotes) >= 4:
                    pid = int(m_id.group(1))
                    people[pid] = {
                        'first_name': quotes[1].strip(),
                        'common_name': quotes[2].strip(),
                        'second_name': quotes[3].strip()
                    }
                continue

            m_parent = re.match(r'^"COMP_PARENT_ID"\s+(\d+)\s+(\d+)', l)
            if m_parent:
                cid, pid = int(m_parent.group(1)), int(m_parent.group(2))
                if cid not in comps:
                    comps[cid] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                comps[cid]['parent_id'] = pid
                comps[cid].setdefault('inactive_fields', set()).discard('parent_id')
                continue

            m_col = re.match(r'^"COMP_COLOUR_CHANGE"\s+(\d+)\s+([0-9\s]+)\s+""', l)
            if m_col:
                cid, col_tokens = int(m_col.group(1)), m_col.group(2).strip().split()
                if cid not in comps:
                    comps[cid] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                if len(col_tokens) >= 7:
                    offset = 2 if len(col_tokens) >= 8 else 1
                    comps[cid]['fg_color'] = f"{col_tokens[offset]} {col_tokens[offset+1]} {col_tokens[offset+2]}"
                    comps[cid]['bg_color'] = f"{col_tokens[offset+3]} {col_tokens[offset+4]} {col_tokens[offset+5]}"
                    comps[cid].setdefault('inactive_fields', set()).discard('colors')
                continue

            m = re.match(r'^"([^"]+)"\s+(\d+)\s+"([^"]*)"', l)
            if m:
                cmd, id_val, val = m.group(1), int(m.group(2)), m.group(3).strip()
                if cmd in ('COMP_LONG_NAME_CHANGE', 'COMP_SHORT_NAME_CHANGE', 'COMP_3LETTER_NAME_CHANGE'):
                    if id_val not in comps:
                        comps[id_val] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                    if cmd == 'COMP_LONG_NAME_CHANGE':
                        comps[id_val]['long_name'] = val
                        comps[id_val].setdefault('inactive_fields', set()).discard('name_lg')
                    elif cmd == 'COMP_SHORT_NAME_CHANGE':
                        comps[id_val]['short_name'] = val
                        comps[id_val].setdefault('inactive_fields', set()).discard('name_sh')
                    elif cmd == 'COMP_3LETTER_NAME_CHANGE':
                        comps[id_val]['three_letter_name'] = val
                        comps[id_val].setdefault('inactive_fields', set()).discard('name_3l')
                elif cmd in ('AWARD_LONG_NAME_CHANGE', 'AWARD_SHORT_NAME_CHANGE'):
                    if id_val not in awards:
                        awards[id_val] = {'confed_id': cur_confed_id, 'nation_code': cur_nat_code, 'category': cur_cat, 'inactive_fields': set()}
                    if cmd == 'AWARD_LONG_NAME_CHANGE':
                        awards[id_val]['long_name'] = val
                        awards[id_val].setdefault('inactive_fields', set()).discard('name_lg')
                    elif cmd == 'AWARD_SHORT_NAME_CHANGE':
                        awards[id_val]['short_name'] = val
                        awards[id_val].setdefault('inactive_fields', set()).discard('name_sh')
                elif cmd == 'STAGE_NAME_LONG_NAME_CHANGE':
                    stages[id_val] = val

    # Also parse fix national team.lnc for competition colors
    file_fnt = os.path.join(lnc_dir, 'fix national team.lnc')
    if os.path.exists(file_fnt):
        print(f"Reading {file_fnt} for competition colors...")
        with open(file_fnt, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                l = line.strip()
                if not l: continue
                m_col = re.match(r'^"COMP_COLOUR_CHANGE"\s+(\d+)\s+([0-9\s]+)\s+""', l)
                if m_col:
                    cid, col_tokens = int(m_col.group(1)), m_col.group(2).strip().split()
                    if len(col_tokens) >= 7:
                        offset = 2 if len(col_tokens) >= 8 else 1
                        fg = f"{col_tokens[offset]} {col_tokens[offset+1]} {col_tokens[offset+2]}"
                        bg = f"{col_tokens[offset+3]} {col_tokens[offset+4]} {col_tokens[offset+5]}"
                        if cid in comps:
                            comps[cid]['fg_color'] = fg
                            comps[cid]['bg_color'] = bg

    comps_batch = []
    comp_name_to_id = {}
    for cid, cdata in comps.items():
        lname = cdata.get('long_name', f'Competition {cid}')
        sname = cdata.get('short_name', lname)
        code = cdata.get('three_letter_name')
        fg = cdata.get('fg_color')
        bg = cdata.get('bg_color')
        conf_id = cdata.get('confed_id')
        nat_id = code_to_nation_id.get(cdata.get('nation_code'))
        is_inter = (nat_id is None)
        parent_id = cdata.get('parent_id')
        inact_set = cdata.get('inactive_fields')
        inact_str = ','.join(sorted(inact_set)) if inact_set else None
        comps_batch.append((cid, lname, sname, code, fg, bg, conf_id, nat_id, cdata.get('category'), inact_str, parent_id))
        comp_name_to_id[lname.lower()] = cid
        comp_name_to_id[sname.lower()] = cid

    execute_batch(cur, """
        INSERT INTO competitions (id, name_lg, name_sh, name_3l, fg_color, bg_color, confed_id, nation_id, type, inactive_fields, parent_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, comps_batch, page_size=1000)
    conn.commit()

    awards_batch = []
    for aid, adata in awards.items():
        lname = adata.get('long_name', f'Award {aid}')
        sname = adata.get('short_name', lname)
        nat_id = code_to_nation_id.get(adata.get('nation_code'))
        comp_id = None
        if adata.get('category'):
            comp_id = comp_name_to_id.get(adata.get('category').lower())
        inact_set = adata.get('inactive_fields')
        inact_str = ','.join(sorted(inact_set)) if inact_set else None
        awards_batch.append((aid, lname, sname, nat_id, comp_id, inact_str))

    execute_batch(cur, """
        INSERT INTO awards (id, name_lg, name_sh, nation_id, comp_id, inactive_fields)
        VALUES (%s, %s, %s, %s, %s, %s);
    """, awards_batch, page_size=1000)
    conn.commit()

    people_batch = [(pid, pdata['first_name'], pdata['common_name'], pdata['second_name']) for pid, pdata in people.items()]
    execute_batch(cur, """
        INSERT INTO people (id, first_name, common_name, second_name)
        VALUES (%s, %s, %s, %s);
    """, people_batch, page_size=1000)
    conn.commit()

    stages_batch = [(sid, sname) for sid, sname in stages.items()]
    execute_batch(cur, """
        INSERT INTO stages (id, name)
        VALUES (%s, %s);
    """, stages_batch, page_size=1000)
    conn.commit()

    # 4. Parse Club & Stadium
    file_cs = os.path.join(lnc_dir, 'FM24 - Club & Stadium.lnc')
    print(f"Reading {file_cs}...")
    clubs = {}
    stadiums = {}
    cur_club_nat_code = None
    cur_comp_cat = None
    cur_stad_cat = None

    with open(file_cs, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            l = line.strip()
            if not l: continue
            if l.startswith('#'):
                h = l.lstrip('#').strip()
                if h.startswith('CLUB >'):
                    parts = [p.strip() for p in h.split('>')]
                    cur_club_nat_code = None
                    if len(parts) > 2:
                        m = re.search(r'\[([A-Z0-9]+)\]\s*(.*)', parts[2])
                        if m: cur_club_nat_code = m.group(1).strip()
                    cur_comp_cat = parts[3].strip() if len(parts) > 3 else None
                    continue
                elif h.startswith('STADIUM >'):
                    parts = [p.strip() for p in h.split('>')]
                    cur_club_nat_code = None
                    if len(parts) > 1:
                        m = re.search(r'\[([A-Z0-9]+)\]\s*(.*)', parts[1])
                        if m: cur_club_nat_code = m.group(1).strip()
                    cur_stad_cat = parts[2].strip() if len(parts) > 2 else None
                    continue

                # Check if it's a commented command:
                m_comm = re.match(r'^#\s*"([^"]+)"\s+(\d+)\s+"([^"]*)"', l)
                if m_comm:
                    cmd, id_val, val = m_comm.group(1), int(m_comm.group(2)), m_comm.group(3).strip()
                    if cmd.startswith('CLUB_'):
                        if id_val not in clubs:
                            clubs[id_val] = {
                                'nation_code': cur_club_nat_code,
                                'comp_cat': cur_comp_cat,
                                'note': None,
                                'inactive_fields': set()
                            }
                        clubs[id_val].setdefault('inactive_fields', set())
                        if cmd == 'CLUB_NAME_CHANGE':
                            clubs[id_val]['long_name'] = val
                            clubs[id_val]['inactive_fields'].add('name_lg')
                        elif cmd == 'CLUB_SHORT_NAME_CHANGE':
                            clubs[id_val]['short_name'] = val
                            clubs[id_val]['inactive_fields'].add('name_sh')
                        elif cmd == 'CLUB_3LETTER_NAME_CHANGE':
                            clubs[id_val]['three_letter_name'] = val
                            clubs[id_val]['inactive_fields'].add('name_3l')
                        elif cmd == 'CLUB_6LETTER_NAME_CHANGE':
                            clubs[id_val]['six_letter_name'] = val
                            clubs[id_val]['inactive_fields'].add('name_6l')
                    elif cmd == 'STADIUM_NAME_CHANGE':
                        if id_val not in stadiums:
                            stadiums[id_val] = {
                                'name': val,
                                'nation_code': cur_club_nat_code,
                                'cat': cur_stad_cat,
                                'note': None,
                                'inactive_fields': set()
                            }
                        stadiums[id_val]['name'] = val
                        stadiums[id_val].setdefault('inactive_fields', set()).add('name')
                continue

            note = None
            if '#' in l:
                cpart, npart = l.split('#', 1)
                note = npart.strip()
                l = cpart.strip()

            m = re.match(r'^"([^"]+)"\s+(\d+)\s+"([^"]*)"', l)
            if m:
                cmd, id_val, val = m.group(1), int(m.group(2)), m.group(3).strip()
                if cmd.startswith('CLUB_'):
                    if id_val not in clubs:
                        clubs[id_val] = {
                            'nation_code': cur_club_nat_code,
                            'comp_cat': cur_comp_cat,
                            'note': note,
                            'inactive_fields': set()
                        }
                    clubs[id_val].setdefault('inactive_fields', set())
                    if cmd == 'CLUB_NAME_CHANGE':
                        clubs[id_val]['long_name'] = val
                        clubs[id_val]['inactive_fields'].discard('name_lg')
                    elif cmd == 'CLUB_SHORT_NAME_CHANGE':
                        clubs[id_val]['short_name'] = val
                        clubs[id_val]['inactive_fields'].discard('name_sh')
                    elif cmd == 'CLUB_3LETTER_NAME_CHANGE':
                        clubs[id_val]['three_letter_name'] = val
                        clubs[id_val]['inactive_fields'].discard('name_3l')
                    elif cmd == 'CLUB_6LETTER_NAME_CHANGE':
                        clubs[id_val]['six_letter_name'] = val
                        clubs[id_val]['inactive_fields'].discard('name_6l')
                    if note and not clubs[id_val].get('note'):
                        clubs[id_val]['note'] = note
                elif cmd == 'STADIUM_NAME_CHANGE':
                    if id_val not in stadiums:
                        stadiums[id_val] = {
                            'name': val,
                            'nation_code': cur_club_nat_code,
                            'cat': cur_stad_cat,
                            'note': note,
                            'inactive_fields': set()
                        }
                    stadiums[id_val]['name'] = val
                    stadiums[id_val].setdefault('inactive_fields', set()).discard('name')
                    if note and not stadiums[id_val].get('note'):
                        stadiums[id_val]['note'] = note

    clubs_batch = []
    for cid, cdata in clubs.items():
        lname = cdata.get('long_name', f'Club {cid}')
        sname = cdata.get('short_name', lname)
        code3 = cdata.get('three_letter_name')
        code6 = cdata.get('six_letter_name')
        nat_id = code_to_nation_id.get(cdata.get('nation_code'))
        comp_cat = cdata.get('comp_cat')
        comp_id = None
        if comp_cat:
            m_comp_id = re.search(r'\[(\d+)\]', comp_cat)
            if m_comp_id:
                comp_id = int(m_comp_id.group(1))
            elif 'OTHER' not in comp_cat and 'EXTINCT' not in comp_cat:
                clean_cat = re.sub(r'\s*\(\d+/\d+\)', '', comp_cat).strip().lower()
                comp_id = comp_name_to_id.get(clean_cat) or comp_name_to_id.get(comp_cat.lower())
        inact_set = cdata.get('inactive_fields')
        inact_str = ','.join(sorted(inact_set)) if inact_set else None
        is_extinct = bool(
            (comp_cat and 'EXTINCT' in comp_cat)
            or (cdata.get('note') and 'extinct' in cdata.get('note').lower())
            or (lname and 'extinct' in lname.lower())
        )
        clubs_batch.append((cid, lname, sname, code6, code3, nat_id, comp_id, cdata.get('note'), inact_str, is_extinct))

    execute_batch(cur, """
        INSERT INTO clubs (id, name_lg, name_sh, name_6l, name_3l, nation_id, comp_id, note, inactive_fields, is_extinct)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, clubs_batch, page_size=2000)
    conn.commit()

    stadiums_batch = []
    for sid, sdata in stadiums.items():
        nat_id = code_to_nation_id.get(sdata.get('nation_code'))
        inact_set = sdata.get('inactive_fields')
        is_training = bool(
            (sdata.get('cat') and 'training' in sdata['cat'].lower())
            or ('training' in sdata['name'].lower())
            or ('pitch' in sdata['name'].lower())
            or ('football base' in sdata['name'].lower())
        )
        stype = 'training pitch' if is_training else 'stadium'
        stadiums_batch.append((sid, sdata['name'], nat_id, stype, bool(inact_set)))

    execute_batch(cur, """
        INSERT INTO stadiums (id, name, nation_id, type, is_disabled)
        VALUES (%s, %s, %s, %s, %s);
    """, stadiums_batch, page_size=2000)
    conn.commit()

    conn.close()
    print("Database seeded successfully with inactive fields support from all 3 .lnc files!")

if __name__ == '__main__':
    seed()
