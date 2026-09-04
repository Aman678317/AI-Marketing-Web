import json, requests

cases = json.load(open('eval_cases.json'))
results = []
for c in cases:
    resp = requests.post('http://localhost:8000/agent/plan', json={'brief': c['brief']})
    plan = resp.json()
    passed = set(plan.get('platforms',[])) >= set(c['expected_platforms']) and plan.get('duration_days') == c['expected_days']
    results.append({'id':c['id'],'passed':passed,'plan':plan})

print(json.dumps(results, indent=2))
