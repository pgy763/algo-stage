import json
import urllib.request

BASE = 'http://localhost:5199/api/run'


def run(lang, code, inp):
    body = json.dumps({'lang': lang, 'code': code, 'input': inp}).encode('utf-8')
    req = urllib.request.Request(BASE, data=body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:  # noqa: BLE001
        return {'ok': False, 'error': 'HTTP: %s' % e}


PY_BUBBLE = '''def bubbleSort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
'''

PY_BINARY = '''def binarySearch(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
'''

JAVA_BUBBLE = '''class Solution {
    static int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = t;
                }
            }
        }
        return arr;
    }
}
'''

CPP_BUBBLE = '''void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
}
'''

C_BUBBLE = '''void bubbleSort(int arr[], int n) {
    int i, j, t;
    for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
}
'''

cases = [
    ('python', 'bubble', PY_BUBBLE),
    ('python', 'binary', PY_BINARY),
    ('java', 'bubble', JAVA_BUBBLE),
    ('cpp', 'bubble', CPP_BUBBLE),
    ('c', 'bubble', C_BUBBLE),
]

for lang, name, code in cases:
    r = run(lang, code, [5, 3, 8, 1, 9, 2, 7, 4])
    if r.get('ok'):
        arr_ok = r.get('result') or (r['steps'][-1]['vars'].get('arr') if r.get('steps') else None)
        print('%-7s %-8s ok steps=%-4d entry=%-12s final=%s' % (
            lang, name, len(r.get('steps') or []), r.get('entry'), arr_ok))
    else:
        print('%-7s %-8s FAIL: %s' % (lang, name, str(r.get('error'))[:220].replace('\n', ' | ')))
