# RotVault development

- `src/` is the frontend. `api/` is an independent Git repository and is ignored by the frontend repository.
- Every `src/**/*.tsx` file must have a matching `test/**/*.test.tsx` file at the same relative path. `test/structure.test.ts` enforces this.
- Add behavior tests for changed logic, especially audio persistence, trimming and API mutations. Test the observable result rather than component internals.
- Before finishing a change, run `pnpm check` in the frontend. Run `pnpm test` in `api/` when the API changes. Keep both CI workflows green.
- Preserve user audio, image and video files and their manifests. Do not regenerate or reset them to sample data.
