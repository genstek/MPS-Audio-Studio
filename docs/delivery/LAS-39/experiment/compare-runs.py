"""Compares two LAS-39 experiment result files item by item (shared metrics).

Usage: python3 -I compare-runs.py FIRST.json SECOND.json
"""
import json, sys

a = json.load(open(sys.argv[1]))
b = json.load(open(sys.argv[2]))
keys = ['tonalMeanDb', 'tonalMaxDb', 'loudnessLu', 'eqCurveDb', 'inputGainDb']
n = diffs = 0
for ra, rb in zip(a['perItem'] + a['leakyPerItem'], b['perItem'] + b['leakyPerItem'], strict=True):
    assert ra['key'] == rb['key']
    for method in ra:
        if method in ('key', 'song'):
            continue
        for k in keys:
            n += 1
            diffs += ra[method][k] != rb[method][k]
print('LAS-39 reproducibility: two complete runs of experiment.js (same code apart from the added shape metric)')
print(f'per-item values compared (shared metrics, grouped + leaky test items, all methods): {n}')
print(f'values that differ: {diffs}')
print('splits identical:', a['splits'] == b['splits'], '| leakage reports identical:', a['leakage'] == b['leakage'], '| ridge lambda identical:', a['ridgeLambda'] == b['ridgeLambda'])
sys.exit(1 if diffs else 0)
