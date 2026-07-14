+++
date = "2026-04-20T10:00:00-04:00"
title = "microvla: A Vision-Language-Action Model from Scratch"
description = "A minimal Vision-Language-Action model in pure Python: scalar autograd, a tiny transformer, and a grid world in a single file."
categories = ['homepage']
tags = ['Python', 'AI', 'Neural Networks', 'Transformers', 'Robotics']
images = [
]
mathjax = false
toc = false
+++

Vision-Language-Action (VLA) models are one of the more exciting parts of recent robotics work. Systems like [RT-2][rt2], [OpenVLA][openvla], and [π0][pi0] take a camera image and a natural language instruction and output robot actions, all within a single transformer. The approach is relatively straightforward. Image patches, text tokens, and action tokens are concatenated into one sequence, and a transformer predicts the next action the same way a language model predicts the next word. The tokenization brings the different modalities of information together.

I wanted to understand the fundamental approach here in more detail, so I built [microvla][repo], a minimal VLA implementation in a single Python file with zero dependencies. The project was directly inspired by Karpathy's [microgpt][microgpt] project: scalar autograd, a tiny transformer, a toy environment, and a complete training loop that runs on a CPU in a few minutes. The model has about 900 parameters. It learns to navigate an 8×8 grid world to a colored target specified in plain text.

This post walks through `microvla.py` and the pieces that make it work.

## Why build this from scratch

My last from-scratch ML post on this site was [Building a Neural Network in Go][goMLP], where I worked through a multi-layer perceptron and backpropagation on MNIST. Libraries today continue to make it easy to use a transformer without ever internalizing what is actually happening under the hood, and the idea here is to gain understanding of that at a deeper level.

VLAs extend the transformer architecture with a conceptual innovation of combining the different modalities of data into one tokenized stream, but there's no fundamentally new math happening. Because of that, this project is able to leverage the same approach taken in [micrograd][micrograd] and thus [microgpt][microgpt].

Using just the python standard library keeps it simple and comprehensible. The verbosity is increased through the presence of typing, but because of the various steps and layers here, it felt useful to statically capture the full detail of what is present in the parameters.

## What a VLA does, minimally

The task in microvla is a mini grid-world analogue of the navigation problems VLAs were originally designed for. An 8×8 grid contains an agent (`B`), three colored targets (`R`, `G`, `Y`), and walls on the border. The instruction is a string like `"go to red"`. The expected output is a sequence of vim-style actions (`h`, `j`, `k`, `l`) that moves the agent to the target. Expert trajectories are generated with BFS (newlines added for clarity, not present in the actual input):

```
########
#..R...#
#......#
#....B.#
#......#
#.....G#
#....Y.#
########|go to red|kkhh
```

The full token sequence for a single example is as follows:

```
[ agent | red | green | yellow | instruction | action_0 | action_1 | ... ]
```

Four "vision" tokens (one per entity, each a normalized `(row, col)` pair projected to `d_model`), one instruction token (lookup embedding for red/green/yellow), and up to three action tokens. The grid never becomes an image, entity positions are encoded directly. A "real" VLA would patchify pixels, but we take a simpler approach here to demonstrate a reasonable tokenization.

## Scalar autograd

The foundation of the approach is a `Value` class that wraps every float in a node of a computation graph, based directly on the approach in [micrograd][micrograd]. Each operator overload records its inputs and defines a local backward closure:

MARK

```python
def __mul__(self, other):
    other = other if isinstance(other, Value) else Value(other)
    out = Value(self.data * other.data, (self, other), "*")

    def _backward():
        self.grad += other.data * out.grad
        other.grad += self.data * out.grad

    out._backward = _backward
    return out
```

`backward()` does a topological sort of the graph and walks it in reverse, summing gradients into each node. This is the micrograd recipe with one deviation: the sort is iterative rather than recursive, because a forward pass through the transformer on a single example produces a graph with tens of thousands of nodes and Python's default recursion limit is not friendly to that.

Despite the goal for ultimate simplicity, there is also a `dot()` helper that short-circuits the usual pattern of building a chain of multiply-and-add nodes for a dot product and instead emits a single fused node with a custom backward. Without that, forward passes are slow way down with Python object allocation for scalar multiplies that immediately get summed — the fused version roughly halves the node count in the hot path.

Everything else — `linear`, `softmax`, `rmsnorm`, `cross_entropy_loss` — is implemented in terms of `Value` arithmetic. There are no explicit matrices, weights are just nested lists of `Value` objects.

## Building the token sequence

`make_sequence` assembles the input for a single example. Vision tokens are projected from 2D position through a learned `linear(2, d_model)` layer, with an added entity-type embedding so the model can tell "the agent" apart from "the red target". The instruction is a straight embedding lookup over three colors. Action tokens are a lookup over the four move directions.

Every token then gets two extra things added to it: a positional embedding (so attention can distinguish token order) and a modality embedding (so vision, instruction, and action tokens are tagged with which modality they came from). That modality embedding is a small thing, but it matters — without it the model has no prior on the structural role of each position in the sequence.

```python
for i, tok in enumerate(tokens):
    if i < 4:
        mod = 0  # vision
    elif i == 4:
        mod = 1  # instruction
    else:
        mod = 2  # action
    out = [tok[d] + pos_emb[i][d] + mod_emb[mod][d] for d in range(D_MODEL)]
```

## The transformer block

A single pre-norm transformer block, implemented the textbook way: RMSNorm, multi-head causal self-attention, residual, RMSNorm, FFN, residual. Two heads, `d_model=16`, head dim of 8, one layer. The attention loop is explicit about the causal mask — at position `i`, queries only see keys at positions `0..i`:

```python
for h in range(N_HEADS):
    hd = h * HEAD_DIM
    for i in range(T):
        q_head = Q[i][hd : hd + HEAD_DIM]
        scores = [dot(q_head, K[j][hd : hd + HEAD_DIM]) / scale
                  for j in range(i + 1)]
        weights = softmax(scores)
        head_out = [weights[0] * V[0][hd + dd] for dd in range(HEAD_DIM)]
        for j in range(1, len(weights)):
            for dd in range(HEAD_DIM):
                head_out[dd] = head_out[dd] + weights[j] * V[j][hd + dd]
        head_outs[i].extend(head_out)
```

No clever batching, no KV cache, no mask tensor — just Python loops. Reading it as code is, I think, clearer than any diagram of attention I've seen, precisely because it is slow and explicit.

## Output head and loss

After the transformer block, the positions corresponding to action tokens get projected through an output head to logits over the four possible actions. The training loss is cross-entropy between those logits and the next-action labels, averaged over the action positions. This is the RT-2/OpenVLA design point: discrete action tokenization makes action prediction structurally identical to next-token prediction in an LM, and the whole model trains with the same objective as GPT-style text models.

```python
for i in range(n_actions):
    pos = 4 + i
    logits = linear(seq[pos], params["head_W"], params["head_b"])
    total_loss = total_loss + cross_entropy_loss(logits, action_indices[i])
```

## Training loop

Training is standard mini-batch SGD with an Adam optimizer implemented by hand. The optimizer keeps first and second moment estimates per parameter and applies a cosine learning rate schedule with a linear warmup — overkill for a ~900 parameter model, but it's the piece that makes training reliably converge in ~2000 steps instead of bouncing around. The warmup in particular matters a lot; without it, the first few gradient steps with a freshly initialized transformer tend to blow something up.

Two evaluation modes are worth distinguishing. Teacher-forced evaluation feeds the ground-truth action tokens into the sequence and asks the model to predict each next action — this is what the training objective directly optimizes. Autoregressive evaluation feeds back the model's own predictions, which is what actually matters at inference time. The gap between these two is where compounding errors show up, and it's the right number to track if you care about whether the model will actually work when deployed.

## Inference and demo

At inference, `predict_actions` runs the same forward pass, but autoregressively: predict one action, append it to the sequence, re-run the transformer, predict the next. The `demo` function generates a few fresh random grids and prints before/after snapshots:

```
Instruction: go to yellow
Initial grid:
########
#..B...#
#......#
#.R....#
#......#
#....Y.#
#..G...#
########

Predicted actions: jjjl
Final grid:
########
#......#
#......#
#.R....#
#......#
#....Y.#
#..G...#
########
SUCCESS
```

This final animation — the agent actually reaching the target from a grid it has never seen — is the reward for all the scalar-autograd suffering. The final model hits around 90% teacher-forced accuracy and around 64% autoregressive accuracy on held-out grids, which is decent given the 900-parameter budget and a single transformer layer. More layers or a wider `d_model` would push that up considerably, but would also blow through the Python-object-per-scalar budget fast.

## What I took away

The structural insight you actually internalize from building this is how much of the "VLA idea" lives in tokenization rather than in the model. Once the image, instruction, and actions are in a single sequence, the transformer doesn't know or care that they are different modalities — attention and residual streams handle the rest. Modality embeddings help it treat each position appropriately, but they are a hint, not an architectural change. The same transformer block that predicts the next word predicts the next action.

There are a lot of natural extensions from here. Real image patches through a learned projection (rather than the cheat of encoding entity positions directly) would be the obvious next step. Multiple transformer layers, bigger embeddings, and a real pixel-level grid would follow. Further out, continuous action prediction (as in π0) or diffusion-based action heads would be much more architectural changes. But as a way to get the tokenization pattern under your fingers, the 900-parameter version is enough.

The code is at [github.com/kujenga/microvla][repo]. It's a single file, runs with just Python 3.14, and produces the output above in a few minutes on a CPU.

<!-- Links -->
[repo]: https://github.com/kujenga/microvla
[microgpt]: https://karpathy.github.io/2026/02/12/microgpt/
[micrograd]: https://github.com/karpathy/micrograd
[goMLP]: {{< ref "go-mlp" >}}
[rt2]: https://robotics-transformer2.github.io/
[openvla]: https://openvla.github.io/
[pi0]: https://www.physicalintelligence.company/blog/pi0
