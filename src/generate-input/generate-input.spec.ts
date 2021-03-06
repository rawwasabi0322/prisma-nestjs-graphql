import assert from 'assert';
import expect from 'expect';
import { Project, QuoteKind, SourceFile } from 'ts-morph';

import {
    generatorOptions,
    getImportDeclarations,
    stringContains,
    stringNotContains,
} from '../testing';
import { createConfig } from '../utils';
import { generateInput } from './generate-input';

describe('generate inputs', () => {
    let sourceFile: SourceFile;
    type OptionsArgs = {
        schema: string;
        name: string;
        sourceFileText?: string;
        options?: string[];
    };
    const getResult = async (args: OptionsArgs) => {
        const { schema, name, sourceFileText, options } = args;
        const project = new Project({
            useInMemoryFileSystem: true,
            manipulationSettings: { quoteKind: QuoteKind.Single },
        });
        const {
            generator,
            prismaClientDmmf: {
                datamodel: { models },
                schema: { inputObjectTypes },
            },
        } = await generatorOptions(schema, options);
        const inputTypes = [
            ...(inputObjectTypes.model || []),
            ...inputObjectTypes.prisma,
        ];
        const inputType = inputTypes.find(x => x.name === name);
        assert(inputType, `Failed to find ${name}`);
        sourceFile = project.createSourceFile('0.ts', sourceFileText);
        generateInput({
            inputType,
            sourceFile,
            projectFilePath: ({ name, type }) => `${name}.${type}.ts`,
            decorator: {
                name: 'InputType',
            },
            config: createConfig(generator.config),
        });
    };
    const struct = (className: string, property: string) =>
        sourceFile.getClass(className)?.getProperty(property)?.getStructure();

    describe('user where input', () => {
        before(async () => {
            await getResult({
                schema: `
            model User {
              id     String      @id
              birth  DateTime
              died   DateTime?
            }
            `,
                name: 'UserWhereInput',
            });
        });

        it('property id has one type', () => {
            const decoratorArguments = sourceFile
                .getClass('UserWhereInput')
                ?.getProperty('id')
                ?.getDecorator('Field')
                ?.getCallExpression()
                ?.getArguments();
            expect(decoratorArguments?.[0]?.getText()).toEqual('() => StringFilter');
            expect(struct('UserWhereInput', 'id')?.type).toEqual('StringFilter');
        });

        it('property AND has one type', () => {
            expect(struct('UserWhereInput', 'AND')?.type).toEqual(
                'Array<UserWhereInput>',
            );
        });

        it('property birth date', async () => {
            expect(struct('UserWhereInput', 'birth')?.type).toEqual('DateTimeFilter');
        });
    });

    it('user where int filter', async () => {
        await getResult({
            schema: `
            model User {
              id     String      @id
              age    Int
            }
            `,
            name: 'UserWhereInput',
        });
        const structure = sourceFile
            .getClass('UserWhereInput')
            ?.getProperty('age')
            ?.getStructure();
        expect(structure).toBeTruthy();
        assert(structure);
        expect(structure.type).toEqual('IntFilter');

        const decoratorArguments = sourceFile
            .getClass('UserWhereInput')
            ?.getProperty('age')
            ?.getDecorator('Field')
            ?.getCallExpression()
            ?.getArguments();
        expect(decoratorArguments?.[0]?.getText()).toEqual('() => IntFilter');

        const imports = getImportDeclarations(sourceFile);

        expect(imports).toContainEqual({
            name: 'StringFilter',
            specifier: './StringFilter.input',
        });
        expect(imports).toContainEqual({
            name: 'IntFilter',
            specifier: './IntFilter.input',
        });
    });

    it('user where string filter', async () => {
        await getResult({
            schema: `
            model User {
              id     String      @id
            }
            `,
            name: 'StringFilter',
        });
        const properties = sourceFile.getClass('StringFilter')?.getProperties();
        const structure = (name: string) =>
            properties?.find(x => x.getName() === name)?.getStructure();

        expect(structure('equals')?.type).toEqual('string');
        expect(structure('lt')?.type).toEqual('string');
        expect(structure('lte')?.type).toEqual('string');
        expect(structure('gt')?.type).toEqual('string');
        expect(structure('gte')?.type).toEqual('string');
        expect(structure('contains')?.type).toEqual('string');
        expect(structure('startsWith')?.type).toEqual('string');
        expect(structure('endsWith')?.type).toEqual('string');

        expect(structure('in')?.type).toEqual('Array<string>');
        expect(structure('notIn')?.type).toEqual('Array<string>');
    });

    it('user create input', async () => {
        await getResult({
            schema: `
            model User {
              id     String      @id
              countComments  Int?
            }
            `,
            name: 'UserCreateInput',
        });

        const idProperty = sourceFile.getClass('UserCreateInput')?.getProperty('id');
        assert(idProperty);

        stringContains(`@Field(() => String`, idProperty.getText());

        const countProperty = sourceFile
            .getClass('UserCreateInput')
            ?.getProperty('countComments');
        assert(countProperty);

        const decoratorArguments = sourceFile
            .getClass('UserCreateInput')
            ?.getProperty('countComments')
            ?.getDecorator('Field')
            ?.getCallExpression()
            ?.getArguments();
        expect(decoratorArguments?.[0]?.getText()).toEqual('() => Int');

        const structure = sourceFile
            .getClass('UserCreateInput')
            ?.getProperty('countComments')
            ?.getStructure();
        assert(structure);
        expect(structure.type).toEqual('number');

        const imports = getImportDeclarations(sourceFile);

        expect(imports).toContainEqual({
            name: 'InputType',
            specifier: '@nestjs/graphql',
        });
        expect(imports).toContainEqual({
            name: 'Int',
            specifier: '@nestjs/graphql',
        });
    });

    it('datetime filter', async () => {
        await getResult({
            schema: `
            model User {
              id     Int      @id
              birth  DateTime
              died   DateTime?
            }
            `,
            name: 'DateTimeFilter',
        });
        sourceFile
            .getClass('DateTimeFilter')
            ?.getProperties()
            ?.filter(p => p.getName() !== 'not')
            .flatMap(p => p.getDecorators())
            .forEach(d => {
                const argument = d.getCallExpression()?.getArguments()?.[0].getText();
                stringNotContains('DateTime', argument || '');
            });
    });

    it('custom datetime type', async () => {
        await getResult({
            schema: `
            model User {
              id     Int      @id
              birth  DateTime
              died   DateTime?
            }
            `,
            name: 'DateTimeFilter',
            options: [
                `types_DateTime_fieldType = "string | Date"`,
                `types_DateTime_graphqlType = "Date"`,
            ],
        });
        const property = sourceFile.getClass('DateTimeFilter')?.getProperty('in');
        assert(property);
        const argument = property.getDecorators()[0]?.getArguments()[0];
        expect(argument.getText()).toEqual('() => [Date]');
        expect(property.getStructure().type).toEqual('Array<string> | Array<Date>');
    });

    it('user scalar where input ex. user filter', async () => {
        await getResult({
            schema: `
            model User {
              id     String    @id
              following        User[]    @relation("UserFollows", references: [id])
              followers        User[]    @relation("UserFollows", references: [id])
            }
            `,
            name: 'UserListRelationFilter',
        });

        expect(struct('UserListRelationFilter', 'every')?.type).toEqual(
            'UserWhereInput',
        );
        expect(struct('UserListRelationFilter', 'some')?.type).toEqual(
            'UserWhereInput',
        );
        expect(struct('UserListRelationFilter', 'none')?.type).toEqual(
            'UserWhereInput',
        );
    });

    it('relation filter property', async () => {
        await getResult({
            schema: `
            model User {
              id        Int      @id
              posts     Post[]
            }
            model Post {
              id        Int      @id
              author    User    @relation(fields: [authorId], references: [id])
              authorId  Int
            }`,
            name: 'PostWhereInput',
        });
        const property = sourceFile.getClass('PostWhereInput')?.getProperty('author');
        assert(property, 'Property author should exists');
        expect(property.getStructure().type).toEqual('UserWhereInput');
    });

    it('enum filter should include enum import', async () => {
        await getResult({
            schema: `
            model User {
              id     String      @id
              role   Role
            }
            enum Role {
                USER
            }
            `,
            name: 'UserWhereInput',
        });
        const imports = getImportDeclarations(sourceFile);
        expect(imports).toContainEqual({
            name: 'EnumRoleFilter',
            specifier: './EnumRoleFilter.input',
        });
    });

    it('compatiblity datetime filter', async () => {
        await getResult({
            schema: `
            model User {
              id Int @id
              da DateTime
            }
            `,
            name: 'DateTimeFilter',
        });
        const classFile = sourceFile.getClass('DateTimeFilter')!;
        const fieldIn = classFile.getProperty('in')!;
        expect(fieldIn.getStructure().type).toEqual('Array<Date> | Array<string>');
    });

    it('duplicated fields in exising file', async () => {
        await getResult({
            schema: `
            model User {
              id Int @id
            }
            `,
            name: 'UserCreateInput',
            sourceFileText: `
                @InputType()
                export class UserCreateInput {
                    @Field(() => String, {
                        nullable: true,
                    })
                    id?: string;
            `,
        });
        const classFile = sourceFile.getClass('UserCreateInput')!;
        const names = classFile.getProperties().map(p => p.getName());
        expect(names).toStrictEqual(['id']);
    });

    it('remove unused import', async () => {
        await getResult({
            schema: `
            model User {
              id Int @id
            }
            `,
            name: 'UserCreateInput',
            sourceFileText: `
                import { a } from 'b';
                import { x } from 'y';
            `,
        });
        const imports = getImportDeclarations(sourceFile).map(x => x.name);
        expect(imports).not.toContain('a');
        expect(imports).not.toContain('x');
    });

    it('user create without posts input', async () => {
        await getResult({
            schema: `
            model User {
              id        Int      @id
              name      String
              bio       String?
              posts     Post[]
            }
            model Post {
              id        Int      @id
              author    User    @relation(fields: [authorId], references: [id])
              authorId  Int
            }`,
            name: 'UserCreateWithoutPostsInput',
        });
        const classDeclaration = sourceFile.getClass('UserCreateWithoutPostsInput')!;

        const nameStructure = classDeclaration.getProperty('name')?.getStructure();
        expect(nameStructure?.type).toEqual('string');
        expect(nameStructure?.hasExclamationToken).toEqual(true);
        expect(nameStructure?.decorators?.[0].arguments?.[0]).toEqual('() => String');
        expect(nameStructure?.decorators?.[0].arguments?.[1]).toContain(
            'nullable: false',
        );

        const bioStructure = classDeclaration.getProperty('bio')?.getStructure();
        expect(bioStructure?.type).toEqual('string');
        expect(bioStructure?.hasQuestionToken).toEqual(true);
        expect(bioStructure?.decorators?.[0].arguments?.[0]).toEqual('() => String');
        expect(bioStructure?.decorators?.[0].arguments?.[1]).toContain(
            'nullable: true',
        );
    });
});
