import { Prisma, User } from "../../../generated/prisma/client";
import { IQueryParams } from "../../interface/query.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { userFilterableFields, userSearchableFields } from "./user.constant";

const getAllUsers = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        User,
        Prisma.UserWhereInput,
        Prisma.UserInclude
    >(prisma.user, query, {
        searchableFields: userSearchableFields,
        filterableFields: userFilterableFields,
    });

    const result = await queryBuilder
        .search()
        .filter()
        .where({
            isDeleted: false,
        })
        .include({
            bookings: true,
            reviews: true,
        })
        // .dynamicInclude(doctorIncludeConfig)
        .paginate()
        .sort()
        .fields()
        .execute();

    return result;
};

export const userService = {
    getAllUsers,
};
