# LAS-36 model-host reachability from this container (2026-10-30T08:37Z)

- https://download.pytorch.org/whl/cpu/torch/ → curl: (56) CONNECT tunnel failed, response 403
000
- https://dl.fbaipublicfiles.com/demucs/ → curl: (56) CONNECT tunnel failed, response 403
000
- https://zenodo.org/ → curl: (56) CONNECT tunnel failed, response 403
000
- https://huggingface.co/ → curl: (56) CONNECT tunnel failed, response 403
000
- https://github.com/sigsep/open-unmix-pytorch/releases → 403
- https://pypi.org/simple/torch/ → 200
- https://pypi.org/simple/onnxruntime/ → 200

pip install torch --index-url https://download.pytorch.org/whl/cpu:
ERROR: Could not find a version that satisfies the requirement torch (from versions: none)
ERROR: No matching distribution found for torch
