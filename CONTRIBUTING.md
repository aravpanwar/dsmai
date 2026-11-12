# Contributing

Corrections and suggestions are welcome, especially for the concept data.

## Start with an issue

Every change starts as an [issue](https://github.com/aravpanwar/dsmai/issues), for example:

- a factual error in a description, year or link
- a missing or wrong dependency
- a concept that should be on the map

Include a source where you can. Most issues are fixed directly, so you don't need to open a pull request.

## Pull requests

If you'd like to make the change yourself, say so in the issue and wait for it to be labelled `approved`. Then open a pull request that links the issue in its description, for example `Closes #12`.

Pull requests that don't link an approved issue are closed automatically.

## Editing the data

All content is in `assets/js/data.js`. Each concept has an `id`, `label`, `text` and `needs` (the ids it is built on), and optionally `year`, `ref` and `aka` (extra search terms).

- A concept can only need concepts in its own layer or an earlier one.
- Use plain hyphens, not en or em dashes.

Before opening a pull request, run:

```sh
node scripts/check.js
```

It must pass. Contributions to the data are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), and contributions to the code under the [MIT License](LICENSE).
