import expect from 'expect';

import { PrismaDMMF } from '../types';
import { getMatchingInputType } from './get-matching-input-type';

describe('get matching input type', () => {
    let inputTypes: PrismaDMMF.SchemaArgInputType[] = [];
    it('mixed types', () => {
        inputTypes = [
            {
                type: 'StringFilter',
                location: 'inputObjectTypes',
                isList: false,
            },
            { type: 'String', location: 'scalar', isList: false },
        ];
        const result = getMatchingInputType(inputTypes);
        expect(result.type).toEqual('StringFilter');
    });

    it('several kind objects xor list', () => {
        inputTypes = [
            {
                type: 'UserWhereInput',
                location: 'inputObjectTypes',
                isList: false,
            },
            {
                type: 'UserWhereInput',
                location: 'inputObjectTypes',
                isList: true,
            },
        ];
        const result = getMatchingInputType(inputTypes);
        expect(result).toEqual({
            type: 'UserWhereInput',
            location: 'inputObjectTypes',
            isList: true,
        });
    });

    it('whereinput over relationfilter', () => {
        inputTypes = [
            {
                type: 'UserRelationFilter',
                location: 'inputObjectTypes',
                isList: false,
            },
            {
                type: 'UserWhereInput',
                location: 'inputObjectTypes',
                isList: false,
            },
        ];
        const result = getMatchingInputType(inputTypes);
        expect(result.type).toEqual('UserWhereInput');
    });

    it('mixed objects with null', () => {
        inputTypes = [
            {
                type: 'UserRelationFilter',
                location: 'inputObjectTypes',
                isList: false,
            },
            {
                type: 'UserWhereInput',
                location: 'inputObjectTypes',
                isList: false,
            },
            { type: 'Null', location: 'scalar', isList: false },
        ];
        const result = getMatchingInputType(inputTypes);
        expect(result.type).toEqual('UserWhereInput');
    });

    it('mixed with null', () => {
        inputTypes = [
            { type: 'IntFilter', location: 'inputObjectTypes', isList: false },
            { type: 'Int', location: 'scalar', isList: false },
            { type: 'Null', location: 'scalar', isList: false },
        ];
        const result = getMatchingInputType(inputTypes);
        expect(result.type).toEqual('IntFilter');
    });

    it('by', () => {
        inputTypes = [
            {
                type: 'UserScalarFieldEnum',
                namespace: 'prisma',
                location: 'enumTypes',
                isList: true,
            },
            {
                type: 'UserScalarFieldEnum',
                namespace: 'prisma',
                location: 'enumTypes',
                isList: false,
            },
        ];
        const result = getMatchingInputType(inputTypes);
        expect(result).toEqual(
            expect.objectContaining({
                type: 'UserScalarFieldEnum',
                isList: true,
            }),
        );
    });
});
