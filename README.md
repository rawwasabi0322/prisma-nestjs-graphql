# prisma-nestjs-graphql

Generate object types, inputs, args, etc. from prisma schema file for usage with @nestjs/graphql module.

## Features

-   Generates only necessary imports
-   Combines zoo of nested/nullable filters
-   Does not generate resolvers, since it's application specific

## Install

```sh
npm install --save-dev prisma-nestjs-graphql
```

## Usage

1. Add new generator section to `schema.prisma` file

```prisma
generator nestgraphql {
    provider = "node node_modules/prisma-nestjs-graphql"
    output = "../src"
}
```

2. Run prisma generate

```sh
npx prisma generate
```

## Generator options

-   `output` Output folder relative to this schema file
-   `outputFilePattern` File pattern (default: `{feature}/{name}.{type}.ts`)  
    Possible tokens:
    -   `{feature}` - model name in dashed case or 'prisma' if unknown
    -   `{name}` - dashed-case name of model/input/arg without suffix
    -   `{type}` - short type name (model, input, args, output)
    -   `{plural.type}` - plural short type name (models, inputs, enums)
-   `combineScalarFilters` - Combine nested/nullable scalar filters to single
    (default: `true`)
-   `atomicNumberOperations` - Atomic number operations,
    `false` - disabled (default), `true` - enabled
-   `reExportAll` - create `index.ts` files for each directory with re-export,
    `false` - disabled (default), `true` - enabled
-   `types_*` - [flatten](https://github.com/hughsk/flat) map of types

    -   `types_{type}_fieldType` - TypeScript type name
    -   `types_{type}_fieldModule` - Module to import
    -   `types_{type}_graphqlType` - GraphQL type name
    -   `types_{type}_graphqlModule` - Module to import

    Where `{type}` is prisma type in schema

    Example (Decimal):

    ```prisma
    types_Decimal_fieldType = "Decimal"
    types_Decimal_fieldModule = "decimal.js"
    types_Decimal_graphqlType = "GraphQLDecimal"
    types_Decimal_graphqlModule = "graphql-type-decimal"
    ```

    Generates field:

    ```ts
    import { GraphQLDecimal } from 'graphql-type-decimal';
    import { Decimal } from 'decimal.js';
    ...
    @Field(() => GraphQLDecimal)
    field: Decimal;
    ```

    Example (DateTime):

    ```prisma
    types_DateTime_fieldType = "Date"
    types_DateTime_graphqlType = "GraphQLISODateTime"
    types_DateTime_graphqlModule = "@nestjs/graphql"
    ```

    Generated fields:

    ```ts
    @Field(() => GraphQLISODateTime)
    field: Date;
    ```

## Similar Projects

-   https://github.com/wSedlacek/prisma-generators/tree/master/libs/nestjs
-   https://github.com/EndyKaufman/typegraphql-prisma-nestjs

## Resources

-   Todo - https://github.com/unlight/prisma-nestjs-graphql/issues/2
-   https://github.com/prisma/prisma/blob/master/src/packages/client/src/generation/TSClient/TSClient.ts
-   https://ts-ast-viewer.com/
-   https://github.com/unlight/nestjs-graphql-prisma-realworld-example-app
-   https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-schema/data-model
-   JSON type for the code first approach - https://github.com/nestjs/graphql/issues/111#issuecomment-631452899
-   https://github.com/paljs/prisma-tools/tree/master/packages/plugins
