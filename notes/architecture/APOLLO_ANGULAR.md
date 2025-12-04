[//]: # (Copyright © 2024 Perpetuator LLC)

# Install via Angular Schematic

```shell
ng add apollo-angular
```

# GraphQL Design

## Schema

All queries and mutations are defined in the `schema.graphql` file.

The schema is updated by running a back-end project command. First get the back-end project, then run:
```shell
python manage.py export_schema --out=schema.graphql --format=sdl
```
Then move the `schema.graphql` file to the front-end project.

All GraphQL queries and mutations should return 200 status codes. If there is an error, the error should be returned in the response body.
Non-200 errors indicate that the GraphQL server is down or there is a network issue (possible HTTPS, etc. issues).

The back-end is designed such that it should never return an error field in the response body.
- If this is seen then it means that an unexpected error occurred on the back-end.
- The front-end should handle this error gracefully and log the error to the console.

If the back-end has an issues with a business rule (data doesn't fit or a computation did not work, etc.), then the back-end should return a 200 status code 
with success = false and the reason in the message field.

## Types - WIP

The types that we use in the front-end are defined in the `schema.graphql` file, but must be converted into TypeScript types.

This is done by running the following command:
```shell
npm run generate
# AI suggested this, what is it?
# apollo client:codegen --target=typescript --outputFlat --includes=src/**/*.ts --localSchemaFile=schema.graphql
```

This will generate TypeScript types in the `src/__generated__` folder.
