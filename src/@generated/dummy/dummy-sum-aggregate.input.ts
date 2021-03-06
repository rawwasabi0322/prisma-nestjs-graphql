import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DummySumAggregateInput {
    @Field(() => Boolean, {
        nullable: true,
    })
    decimal?: true;

    @Field(() => Boolean, {
        nullable: true,
    })
    bigInt?: true;
}
